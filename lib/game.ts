import { supabase, BUCKET } from '@/lib/supabase';
import { Meme, Player, Room, RoomSettings, Round, Submission, TextLayer, TextPositions, Vote } from '@/types';
import { renderMemeToImage } from '@/lib/meme-render';

export const VOTE_SECONDS = 15;
export const WRITE_GRACE_MS = 3000; // grace to let auto-submits arrive
export const MAX_PLAYERS = 12;
export const DEFAULT_SETTINGS: RoomSettings = { rounds: 5, timePerRound: 60, clipSource: 'host_only' };

const COLORS = ['#FFE600', '#FF4D4D', '#4DA6FF', '#5CE65C', '#FF8A3D', '#C77DFF', '#2EE6C5', '#FF7AC6'];
const EMOJIS = ['😎', '🤡', '👻', '🔥', '🐸', '💀', '🦄', '🍕', '🐵', '🤖', '👽', '🐷'];
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

export function normalizeCode(raw: string): string {
  const c = raw.toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/^MEME/, '');
  return 'MEME-' + c.slice(0, 4);
}

function genCode(): string {
  let s = '';
  for (let i = 0; i < 4; i++) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return 'MEME-' + s;
}

// ---------- server clock ----------
let offsetMs = 0;
export async function syncClock() {
  try {
    const t0 = Date.now();
    const { data } = await supabase.rpc('server_now');
    const t1 = Date.now();
    if (data) offsetMs = new Date(data as string).getTime() - (t0 + t1) / 2;
  } catch { /* keep 0 */ }
}
export const serverNow = () => Date.now() + offsetMs;
export const toIso = (ms: number) => new Date(ms).toISOString();

// ---------- rooms & players ----------
export async function createRoom(nickname: string): Promise<{ room: Room; player: Player }> {
  for (let i = 0; i < 5; i++) {
    const { data: room, error } = await supabase
      .from('rooms').insert({ code: genCode(), settings: DEFAULT_SETTINGS }).select().single();
    if (error) { if (error.code === '23505') continue; throw error; }
    const player = await addPlayer(room.id, nickname, true);
    await supabase.from('rooms').update({ host_id: player.id }).eq('id', room.id);
    return { room: { ...room, host_id: player.id } as Room, player };
  }
  throw new Error('No pudimos generar un código');
}

export async function findRoom(code: string): Promise<Room | null> {
  const { data } = await supabase.from('rooms').select('*').eq('code', normalizeCode(code)).maybeSingle();
  return (data as Room) || null;
}

export async function addPlayer(roomId: string, nickname: string, isHost = false): Promise<Player> {
  const { data, error } = await supabase.from('players').insert({
    room_id: roomId,
    nickname: nickname.trim().slice(0, 20),
    avatar_color: pick(COLORS),
    avatar_emoji: pick(EMOJIS),
    is_host: isHost,
  }).select().single();
  if (error) throw error;
  return data as Player;
}

export async function joinRoom(code: string, nickname: string): Promise<{ room: Room; player: Player }> {
  const room = await findRoom(code);
  if (!room) throw new Error('NOT_FOUND');
  const { count } = await supabase.from('players').select('id', { count: 'exact', head: true }).eq('room_id', room.id);
  if ((count ?? 0) >= MAX_PLAYERS) throw new Error('FULL');
  const player = await addPlayer(room.id, nickname);
  return { room, player };
}

export async function toggleReady(p: Player) {
  await supabase.from('players').update({ is_ready: !p.is_ready }).eq('id', p.id);
}

export async function updateSettings(room: Room, patch: Partial<RoomSettings>) {
  await supabase.from('rooms').update({ settings: { ...room.settings, ...patch } }).eq('id', room.id);
}

export async function promoteHost(roomId: string, playerId: string) {
  await supabase.from('players').update({ is_host: false }).eq('room_id', roomId);
  await supabase.from('players').update({ is_host: true }).eq('id', playerId);
  await supabase.from('rooms').update({ host_id: playerId }).eq('id', roomId);
}

export async function leaveRoom(room: Room, me: Player, others: Player[]) {
  await supabase.from('players').delete().eq('id', me.id);
  if (me.is_host) {
    const next = [...others].filter((p) => p.id !== me.id).sort((a, b) => a.joined_at.localeCompare(b.joined_at))[0];
    if (next) await promoteHost(room.id, next.id);
  }
}

// ---------- game flow ----------
export function defaultLayers(pos?: TextPositions | null): TextLayer[] {
  const base = {
    fontSize: 44, fontFamily: 'impact' as const, color: '#FFFFFF', strokeWidth: 4, strokeColor: '#000000',
    uppercase: true, align: 'center' as const, rotation: 0, opacity: 100,
  };
  return [
    { ...base, id: 'top', text: '', x: pos?.top?.x ?? 50, y: pos?.top?.y ?? 10 },
    { ...base, id: 'bottom', text: '', x: pos?.bottom?.x ?? 50, y: pos?.bottom?.y ?? 90 },
  ];
}

export async function fetchMemes(onlyActive = true): Promise<Meme[]> {
  let q = supabase.from('memes').select('*').order('created_at', { ascending: false });
  if (onlyActive) q = q.eq('is_active', true);
  const { data } = await q;
  return (data as Meme[]) || [];
}

async function pickMeme(room: Room): Promise<Meme | null> {
  let q = supabase.from('memes').select('*').eq('is_active', true);
  if (room.settings.clipSource === 'host_only') q = q.eq('created_by', 'admin');
  const { data } = await q;
  let pool = (data as Meme[]) || [];
  const { data: used } = await supabase.from('rounds').select('meme_id').eq('room_id', room.id);
  const usedIds = new Set((used || []).map((r: any) => r.meme_id));
  const fresh = pool.filter((m) => !usedIds.has(m.id));
  if (fresh.length) pool = fresh; // no repeats in a game (unless we ran out of clips)
  return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
}

export async function startGame(room: Room): Promise<string | null> {
  const meme = await pickMeme(room);
  if (!meme) return 'NO_MEMES';
  await supabase.from('players').update({ score: 0, is_ready: false }).eq('room_id', room.id);
  await supabase.from('rooms').update({ current_round: 0 }).eq('id', room.id);
  return startRound({ ...room, current_round: 0 });
}

/** Creates the next round (guarded against double clicks). Returns an error code or null. */
export async function startRound(room: Room): Promise<string | null> {
  const next = room.current_round + 1;
  if (next > room.settings.rounds) {
    await supabase.from('rooms').update({ status: 'finished' }).eq('id', room.id);
    return null;
  }
  const meme = await pickMeme(room);
  if (!meme) return 'NO_MEMES';
  const { data: claimed } = await supabase.from('rooms')
    .update({ current_round: next, current_meme_id: meme.id, status: 'playing' })
    .eq('id', room.id).eq('current_round', room.current_round).select();
  if (!claimed || !claimed.length) return null; // someone else already did it
  const ends = serverNow() + room.settings.timePerRound * 1000;
  await supabase.from('rounds').insert({
    room_id: room.id, round_number: next, meme_id: meme.id, phase: 'writing', ends_at: toIso(ends), voting_index: 0,
  });
  return null;
}

export async function moveToVoting(round: Round) {
  const { data } = await supabase.from('rounds')
    .update({ phase: 'voting', voting_index: 0, ends_at: toIso(serverNow() + VOTE_SECONDS * 1000) })
    .eq('id', round.id).eq('phase', 'writing').select();
  if (data && data.length) await supabase.from('rooms').update({ status: 'voting' }).eq('id', round.room_id);
}

export function sortedSubs(subs: Submission[]): Submission[] {
  // Stable order for everybody (random uuids): nobody can guess authorship from submit time
  return [...subs].sort((a, b) => a.id.localeCompare(b.id));
}

export async function advanceVoting(round: Round, total: number) {
  const next = round.voting_index + 1;
  if (next >= total) return finishVoting(round);
  await supabase.from('rounds')
    .update({ voting_index: next, ends_at: toIso(serverNow() + VOTE_SECONDS * 1000) })
    .eq('id', round.id).eq('voting_index', round.voting_index).eq('phase', 'voting');
}

export function pointsFor(subId: string, votes: Vote[]) {
  return votes.filter((v) => v.submission_id === subId).reduce((s, v) => s + v.points, 0);
}

export async function finishVoting(round: Round) {
  const { data: claimed } = await supabase.from('rounds')
    .update({ phase: 'results' }).eq('id', round.id).eq('phase', 'voting').select();
  if (!claimed || !claimed.length) return; // another client already finished it
  await supabase.from('rooms').update({ status: 'playing' }).eq('id', round.room_id);
  const { data: subs } = await supabase.from('submissions').select('*').eq('round_id', round.id);
  const ids = (subs || []).map((s: any) => s.id);
  if (!ids.length) return;
  const { data: votes } = await supabase.from('votes').select('*').in('submission_id', ids);
  await Promise.all((subs as Submission[]).map(async (s) => {
    const pts = pointsFor(s.id, (votes as Vote[]) || []);
    if (!pts) return;
    const { data: p } = await supabase.from('players').select('score').eq('id', s.player_id).maybeSingle();
    if (p) await supabase.from('players').update({ score: (p.score || 0) + pts }).eq('id', s.player_id);
  }));
}

export async function playAgain(room: Room) {
  await supabase.from('rounds').delete().eq('room_id', room.id);
  await supabase.from('players').update({ score: 0, is_ready: false }).eq('room_id', room.id);
  await supabase.from('rooms').update({ status: 'lobby', current_round: 0, current_meme_id: null }).eq('id', room.id);
}

// ---------- submissions & votes ----------
export async function submitMeme(round: Round, player: Player, meme: Meme, layersIn: TextLayer[]) {
  let layers = layersIn;
  if (!layers.some((l) => l.text.trim())) {
    layers = layers.map((l, i) => (i === 0 ? { ...l, text: 'JAJAJA' } : l));
  }
  let url: string | null = null;
  try {
    const blob = await renderMemeToImage(meme.media_url, meme.type, layers);
    const path = `renders/${round.id}/${player.id}.jpg`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: 'image/jpeg', upsert: true });
    if (!error) url = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  } catch { /* fallback: layers JSON rendered with HTML while voting */ }
  const top = layers[0]?.text ?? '';
  const bottom = layers[1]?.text ?? '';
  const { error } = await supabase.from('submissions').upsert(
    { round_id: round.id, player_id: player.id, top_text: top, bottom_text: bottom, text_layers: layers, rendered_image_url: url },
    { onConflict: 'round_id,player_id' }
  );
  if (error) throw error;
}

export async function castVote(subId: string, voterId: string, points: 0 | 1 | 2) {
  await supabase.from('votes').upsert({ submission_id: subId, voter_id: voterId, points }, { onConflict: 'submission_id,voter_id', ignoreDuplicates: true });
}
