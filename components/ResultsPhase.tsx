'use client';
import { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { Meme, Player, Room, Round, Submission, Vote } from '@/types';
import MemeCanvas from './MemeCanvas';
import Leaderboard from './Leaderboard';
import { pointsFor, sortedSubs, startRound } from '@/lib/game';
import { playSound } from '@/lib/sound';

export default function ResultsPhase({ room, round, meme, me, players, submissions, votes }: {
  room: Room; round: Round; meme: Meme | null; me: Player; players: Player[]; submissions: Submission[]; votes: Vote[];
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const last = round.round_number >= room.settings.rounds;
  const rows = sortedSubs(submissions)
    .map((s) => ({ s, pts: pointsFor(s.id, votes), author: players.find((p) => p.id === s.player_id) }))
    .sort((a, b) => b.pts - a.pts);
  const gains: Record<string, number> = {};
  rows.forEach((r) => { if (r.author) gains[r.author.id] = r.pts; });

  useEffect(() => {
    playSound('win');
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.4 }, colors: ['#FFE600', '#0A0A0A', '#FFFFFF'] });
  }, [round.id]);

  const next = async () => {
    setBusy(true);
    const e = await startRound(room);
    if (e === 'NO_MEMES') setErr('No hay clips activos');
    setBusy(false);
  };

  return (
    <main className="max-w-2xl mx-auto p-4 space-y-5">
      <h2 className="font-display text-3xl text-brand text-center">RESULTADOS · RONDA {round.round_number}</h2>
      {rows.length === 0 && <p className="text-center text-neutral-400">Nadie mandó nada 😴</p>}
      {rows.map((r, i) => (
        <div key={r.s.id} className="card space-y-2 animate-slide-up" style={{ animationDelay: `${i * 120}ms` }}>
          <MemeCanvas meme={meme} layers={r.s.text_layers} renderedUrl={r.s.rendered_image_url} />
          <div className="flex justify-between items-center">
            <span className="font-extrabold">{i === 0 && r.pts > 0 ? '🏆 ' : ''}{r.author?.nickname || '???'}</span>
            <span className="font-display text-brand text-xl">+{r.pts} pts</span>
          </div>
        </div>
      ))}
      <h3 className="font-display text-xl">TABLA</h3>
      <Leaderboard players={players} meId={me.id} gains={gains} />
      {me.is_host ? (
        <>
          {err && <p className="text-red-400 font-bold">{err}</p>}
          <button className="btn w-full !text-base !py-4" disabled={busy} onClick={next}>{last ? 'VER PODIO 🏆' : 'SIGUIENTE RONDA'}</button>
        </>
      ) : <p className="text-center text-neutral-400 font-bold">Esperando al host...</p>}
    </main>
  );
}
