'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Meme, Player, Room, Round, Submission, Vote } from '@/types';
import { getPlayerId } from '@/lib/session';
import {
  advanceVoting, finishVoting, moveToVoting, promoteHost, serverNow, sortedSubs, syncClock,
  VOTE_SECONDS, WRITE_GRACE_MS,
} from '@/lib/game';

export interface RoomState {
  loading: boolean;
  notFound: boolean;
  room: Room | null;
  players: Player[];
  me: Player | null;
  round: Round | null;
  meme: Meme | null;
  submissions: Submission[];
  votes: Vote[];
  presentIds: Set<string>;
  reload: () => void;
}

/** Realtime subscription + (host-first) game driver for a room. */
export function useRoom(code: string): RoomState {
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [round, setRound] = useState<Round | null>(null);
  const [meme, setMeme] = useState<Meme | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [presentIds, setPresentIds] = useState<Set<string>>(new Set());
  const [playerId, setPid] = useState<string | null>(null);

  const roomIdRef = useRef<string | null>(null);
  const memeCache = useRef<Record<string, Meme>>({});
  const debounce = useRef<any>(null);

  const refresh = useCallback(async () => {
    const roomId = roomIdRef.current;
    if (!roomId) return;
    const [{ data: r }, { data: ps }, { data: rs }] = await Promise.all([
      supabase.from('rooms').select('*').eq('id', roomId).maybeSingle(),
      supabase.from('players').select('*').eq('room_id', roomId).order('joined_at', { ascending: true }),
      supabase.from('rounds').select('*').eq('room_id', roomId).order('round_number', { ascending: false }).limit(1),
    ]);
    if (r) setRoom(r as Room);
    setPlayers((ps as Player[]) || []);
    const rd = ((rs as Round[]) || [])[0] || null;
    setRound(rd);
    if (!rd) { setMeme(null); setSubmissions([]); setVotes([]); return; }
    if (!memeCache.current[rd.meme_id]) {
      const { data: m } = await supabase.from('memes').select('*').eq('id', rd.meme_id).maybeSingle();
      if (m) memeCache.current[rd.meme_id] = m as Meme;
    }
    setMeme(memeCache.current[rd.meme_id] || null);
    const { data: ss } = await supabase.from('submissions').select('*').eq('round_id', rd.id);
    setSubmissions((ss as Submission[]) || []);
    const ids = ((ss as Submission[]) || []).map((s) => s.id);
    if (ids.length) {
      const { data: vs } = await supabase.from('votes').select('*').in('submission_id', ids);
      setVotes((vs as Vote[]) || []);
    } else setVotes([]);
  }, []);

  const scheduleRefresh = useCallback(() => {
    clearTimeout(debounce.current);
    debounce.current = setTimeout(refresh, 120);
  }, [refresh]);

  // initial load + realtime
  useEffect(() => {
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let poll: any;
    (async () => {
      await syncClock();
      const { data: r } = await supabase.from('rooms').select('*').eq('code', code).maybeSingle();
      if (cancelled) return;
      if (!r) { setNotFound(true); setLoading(false); return; }
      roomIdRef.current = r.id;
      setPid(getPlayerId(code));
      await refresh();
      if (cancelled) return;
      setLoading(false);
      channel = supabase.channel(`db:${r.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${r.id}` }, scheduleRefresh)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${r.id}` }, scheduleRefresh)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'rounds', filter: `room_id=eq.${r.id}` }, scheduleRefresh)
        // submissions/votes have no room_id: refetch is scoped to the current round
        .on('postgres_changes', { event: '*', schema: 'public', table: 'submissions' }, scheduleRefresh)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'votes' }, scheduleRefresh)
        .subscribe();
      // safety net in case realtime is off / drops
      poll = setInterval(refresh, 4000);
    })();
    return () => {
      cancelled = true;
      clearInterval(poll);
      clearTimeout(debounce.current);
      if (channel) supabase.removeChannel(channel);
    };
  }, [code, refresh, scheduleRefresh]);

  const me = players.find((p) => p.id === playerId) || null;

  // refs with the freshest state for the interval-based driver
  const live = useRef({ room, players, round, submissions, votes, me, presentIds });
  live.current = { room, players, round, submissions, votes, me, presentIds };

  // presence: who has the tab open right now
  const myId = me?.id;
  useEffect(() => {
    if (!myId) return;
    const ch = supabase.channel(`presence:${code}`, { config: { presence: { key: myId } } });
    ch.on('presence', { event: 'sync' }, () => setPresentIds(new Set(Object.keys(ch.presenceState()))))
      .subscribe(async (status) => { if (status === 'SUBSCRIBED') await ch.track({ at: Date.now() }); });
    return () => { supabase.removeChannel(ch); };
  }, [code, myId]);

  // janitor: drop absent players (lobby only) and promote a new host if the host vanished > 30s
  useEffect(() => {
    if (!myId) return;
    const absent: Record<string, number> = {};
    const t = setInterval(async () => {
      const { room, players, presentIds, me } = live.current;
      if (!room || !me || presentIds.size === 0 || !presentIds.has(me.id)) return;
      const now = Date.now();
      for (const p of players) {
        if (presentIds.has(p.id)) { delete absent[p.id]; continue; }
        absent[p.id] ??= now;
      }
      const present = players.filter((p) => presentIds.has(p.id)).sort((a, b) => a.joined_at.localeCompare(b.joined_at));
      if (!present.length || present[0].id !== me.id) return; // only the oldest present player cleans up
      for (const p of players) {
        if (!absent[p.id] || now - absent[p.id] < 30000) continue;
        if (room.status === 'lobby') await supabase.from('players').delete().eq('id', p.id); // started games keep scores
        if (p.is_host) await promoteHost(room.id, me.id);
        delete absent[p.id];
      }
      if (!players.some((p) => p.is_host)) await promoteHost(room.id, me.id);
    }, 5000);
    return () => clearInterval(t);
  }, [myId]);

  // game driver: host acts first, everyone else steps in if the host stalls (e.g. backgrounded phone)
  useEffect(() => {
    if (!myId) return;
    const inflight = new Set<string>();
    const t = setInterval(async () => {
      const { room, players, round, submissions, votes, me } = live.current;
      if (!room || !round || !me || room.status === 'finished' || room.status === 'lobby') return;
      const lag = me.is_host ? 0 : 6000;
      const now = serverNow();
      const ends = new Date(round.ends_at).getTime();
      const run = async (key: string, fn: () => Promise<void>) => {
        if (inflight.has(key)) return;
        inflight.add(key);
        try { await fn(); } finally { setTimeout(() => inflight.delete(key), 3000); }
      };
      if (round.phase === 'writing') {
        const allIn = players.length > 0 && submissions.length >= players.length;
        if (now >= ends + WRITE_GRACE_MS + lag || (me.is_host && allIn)) {
          await run(`w:${round.id}`, () => moveToVoting(round));
        }
      } else if (round.phase === 'voting') {
        const ordered = sortedSubs(submissions);
        if (!ordered.length) { await run(`f:${round.id}`, () => finishVoting(round)); return; }
        const cur = ordered[round.voting_index];
        if (!cur) { await run(`f:${round.id}`, () => finishVoting(round)); return; }
        const eligible = players.filter((p) => p.id !== cur.player_id).length;
        const got = votes.filter((v) => v.submission_id === cur.id).length;
        const startedMs = ends - VOTE_SECONDS * 1000;
        const early = me.is_host && eligible > 0 && got >= eligible && now - startedMs > 2500;
        if (now >= ends + lag || early) {
          await run(`v:${round.id}:${round.voting_index}`, () => advanceVoting(round, ordered.length));
        }
      }
    }, 1000);
    return () => clearInterval(t);
  }, [myId]);

  return {
    loading, notFound, room, players, me, round, meme, submissions, votes, presentIds,
    reload: () => { setPid(getPlayerId(code)); refresh(); },
  };
}

/** Seconds left based on the server-synced clock (ends_at in DB is the source of truth). */
export function useCountdown(endsAt: string | null | undefined) {
  const [ms, setMs] = useState(0);
  useEffect(() => {
    if (!endsAt) { setMs(0); return; }
    const end = new Date(endsAt).getTime();
    const tick = () => setMs(Math.max(0, end - serverNow()));
    tick();
    const t = setInterval(tick, 200);
    return () => clearInterval(t);
  }, [endsAt]);
  return ms;
}
