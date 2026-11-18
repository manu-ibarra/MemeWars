'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Player, Room } from '@/types';
import PlayerList from './PlayerList';
import Logo from './Logo';
import { leaveRoom, startGame, toggleReady, updateSettings } from '@/lib/game';
import { clearPlayerId } from '@/lib/session';

function Seg<T extends string | number>({ label, value, opts, onPick }: { label: string; value: T; opts: { v: T; t: string }[]; onPick: (v: T) => void }) {
  return (
    <div>
      <div className="text-xs font-extrabold text-neutral-400 mb-1">{label}</div>
      <div className="flex gap-2 flex-wrap">
        {opts.map((o) => (
          <button key={String(o.v)} onClick={() => onPick(o.v)} className={`chip ${o.v === value ? 'chip-on' : ''}`}>{o.t}</button>
        ))}
      </div>
    </div>
  );
}

export default function Lobby({ room, players, me, presentIds }: { room: Room; players: Player[]; me: Player; presentIds: Set<string> }) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const s = room.settings;

  const copy = async () => {
    const link = `${window.location.origin}/room/${room.code}`;
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* ignore */ }
  };
  const start = async () => {
    setBusy(true); setErr('');
    const e = await startGame(room);
    if (e === 'NO_MEMES') setErr('Todavía no hay clips, subí el primero en /admin');
    setBusy(false);
  };
  const leave = async () => {
    await leaveRoom(room, me, players);
    clearPlayerId(room.code);
    router.push('/');
  };

  return (
    <main className="max-w-3xl mx-auto p-4 space-y-5">
      <header className="flex items-center justify-between gap-3 flex-wrap">
        <Logo width={110} />
        <div className="flex items-center gap-2">
          <div className="bg-brand text-black font-display text-lg tracking-widest rounded-full px-5 py-2.5" aria-label="Código de sala">{room.code}</div>
          <button onClick={copy} className="btn btn-sm" aria-label="Copiar link">{copied ? '✅ COPIADO' : '📋 COPIAR'}</button>
        </div>
      </header>

      <div className="flex justify-between items-center">
        <h2 className="font-display text-2xl">SALA <span className="text-brand">({players.length})</span></h2>
        <button onClick={leave} className="text-sm underline text-neutral-400 min-h-[44px]">Salir</button>
      </div>
      <PlayerList players={players} meId={me.id} presentIds={presentIds} />
      <p className="text-neutral-400 text-sm text-center">Pasale el código o el link a tus amigos. Aparecen acá solos, sin refrescar 😎</p>

      {me.is_host ? (
        <div className="card-y space-y-4">
          <h3 className="font-display text-lg">CONFIGURACIÓN</h3>
          <Seg label="RONDAS" value={s.rounds} opts={[3, 5, 10].map((v) => ({ v, t: String(v) }))} onPick={(v) => updateSettings(room, { rounds: v })} />
          <Seg label="TIEMPO POR RONDA" value={s.timePerRound} opts={[45, 60, 90].map((v) => ({ v, t: `${v}s` }))} onPick={(v) => updateSettings(room, { timePerRound: v })} />
          <Seg label="CLIPS" value={s.clipSource} opts={[{ v: 'host_only', t: 'Solo mis clips' }, { v: 'all', t: 'Todos los clips activos' }]} onPick={(v) => updateSettings(room, { clipSource: v })} />
          {err && <p className="text-red-400 font-bold">{err}</p>}
          <button className="btn w-full !text-base !py-4" disabled={players.length < 2 || busy} onClick={start}>
            {busy ? 'ARRANCANDO...' : 'EMPEZAR PARTIDA'}
          </button>
          {players.length < 2 && <p className="text-center text-sm text-neutral-400">Hacen falta al menos 2 jugadores</p>}
        </div>
      ) : (
        <div className="card-y space-y-3 text-center">
          <p className="font-bold">{s.rounds} rondas · {s.timePerRound}s · el host arranca cuando estén todos</p>
          <button className="btn w-full !text-base" onClick={() => toggleReady(me)}>{me.is_ready ? '✅ LISTO (tocá para cancelar)' : 'ESTOY LISTO'}</button>
        </div>
      )}
    </main>
  );
}
