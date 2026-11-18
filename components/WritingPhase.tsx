'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Meme, Player, Round, Submission, TextLayer } from '@/types';
import MemeEditor from './MemeEditor';
import TimerBar from './TimerBar';
import Loading from './Loading';
import { defaultLayers, submitMeme } from '@/lib/game';
import { useCountdown } from '@/hooks/useRoom';

export default function WritingPhase({ round, meme, me, players, submissions, totalSec, totalRounds }: {
  round: Round; meme: Meme | null; me: Player; players: Player[]; submissions: Submission[]; totalSec: number; totalRounds: number;
}) {
  const [layers, setLayers] = useState<TextLayer[]>(() => defaultLayers(meme?.default_text_positions));
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const left = useCountdown(round.ends_at);
  const submitted = submissions.some((s) => s.player_id === me.id);
  const auto = useRef(false);
  const layersRef = useRef(layers);
  layersRef.current = layers;

  // reset when the meme changes (new round)
  useEffect(() => { setLayers(defaultLayers(meme?.default_text_positions)); auto.current = false; }, [round.id]); // eslint-disable-line

  const send = async () => {
    if (!meme || sending || submitted) return;
    setSending(true); setError('');
    try { await submitMeme(round, me, meme, layersRef.current); }
    catch { setError('No se pudo enviar, probá de nuevo'); auto.current = false; }
    setSending(false);
  };

  // auto-submit when the (server-synced) timer ends
  useEffect(() => {
    if (left <= 0 && round.ends_at && !submitted && !auto.current && meme) { auto.current = true; send(); }
  }, [left, submitted, meme]); // eslint-disable-line

  const ready = useMemo(() => !!meme, [meme]);
  if (!ready) return <Loading />;

  return (
    <main className="max-w-2xl mx-auto p-4 space-y-4">
      <div className="flex justify-between items-center font-display">
        <span className="text-brand">RONDA {round.round_number}/{totalRounds}</span>
        <span className="text-sm text-neutral-400">{submissions.length}/{players.length} enviaron</span>
      </div>
      <TimerBar remainingMs={left} totalSec={totalSec} />
      <MemeEditor meme={meme!} layers={layers} onChange={setLayers} disabled={submitted || sending} />
      {error && <p className="text-red-400 font-bold text-center">{error}</p>}
      {submitted ? (
        <div className="card-y text-center font-display text-xl">¡ENVIADO! ✅<div className="text-sm font-sans font-bold text-neutral-400 mt-1">Esperando al resto...</div></div>
      ) : (
        <button className="btn w-full !text-2xl !py-5 sticky bottom-3" disabled={sending} onClick={send}>{sending ? 'ENVIANDO...' : 'ENVIAR MEME'}</button>
      )}
    </main>
  );
}
