'use client';
import { useEffect, useRef, useState } from 'react';
import { Meme, Submission } from '@/types';
import MemeCanvas from './MemeCanvas';
import { playSound } from '@/lib/sound';

export default function VotingCard({ meme, submission, isMine, myVote, voteCount, eligible, onVote }: {
  meme: Meme | null; submission: Submission; isMine: boolean; myVote: number | null;
  voteCount: number; eligible: number; onVote: (p: 0 | 1 | 2) => void;
}) {
  const [pop, setPop] = useState(0);
  const last = useRef(voteCount);
  useEffect(() => { if (voteCount !== last.current) { setPop((n) => n + 1); last.current = voteCount; } }, [voteCount]);
  const opts: { p: 0 | 1 | 2; label: string; cls: string }[] = [
    { p: 2, label: '😂 ME MATÓ (2)', cls: '' },
    { p: 1, label: '🔥 ZARPADO (1)', cls: '' },
    { p: 0, label: '😐 MEH (0)', cls: 'btn-outline' },
  ];
  return (
    <div className="space-y-4">
      <MemeCanvas meme={meme} layers={submission.text_layers} renderedUrl={submission.rendered_image_url} />
      <div className="flex justify-between items-center">
        <span className="text-sm text-neutral-400 font-bold">VOTOS</span>
        <span key={pop} className="font-display text-brand text-2xl animate-pop">{voteCount}/{eligible}</span>
      </div>
      {isMine ? (
        <div className="card-y text-center font-display text-xl">ESTE ES TUYO 😏 — esperá a que voten</div>
      ) : (
        <div className="grid gap-3">
          {opts.map((o) => (
            <button
              key={o.p} disabled={myVote !== null}
              onClick={() => { playSound('vote'); onVote(o.p); }}
              className={`btn !text-base ${o.cls} ${myVote === o.p ? 'ring-4 ring-white' : ''}`}
              aria-label={o.label}
            >{o.label}</button>
          ))}
          {myVote !== null && <p className="text-center text-neutral-400 font-bold">¡Voto guardado! Esperando al resto...</p>}
        </div>
      )}
    </div>
  );
}
