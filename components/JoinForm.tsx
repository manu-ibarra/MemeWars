'use client';
import { useEffect, useState } from 'react';
import { joinRoom, normalizeCode } from '@/lib/game';
import { getNick, setNick, setPlayerId } from '@/lib/session';

/** Nickname (+ optional code) -> joins a room and calls onJoined(code) */
export default function JoinForm({ initialCode = '', lockCode = false, onJoined }: { initialCode?: string; lockCode?: boolean; onJoined: (code: string) => void }) {
  const [nick, setN] = useState('');
  const [code, setCode] = useState(initialCode);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => setN(getNick()), []);

  const go = async () => {
    if (!nick.trim()) return setErr('Poné tu apodo, che');
    if (!code.trim()) return setErr('Falta el código de sala');
    setBusy(true); setErr('');
    try {
      const { room, player } = await joinRoom(code, nick);
      setNick(nick.trim());
      setPlayerId(room.code, player.id);
      onJoined(room.code);
    } catch (e: any) {
      setErr(e.message === 'NOT_FOUND' ? 'Esa sala no existe, ¿querés crear una?' : e.message === 'FULL' ? 'La sala está llena (máx. 12)' : 'No pudimos entrar, probá de nuevo');
      setBusy(false);
    }
  };

  return (
    <div className="card-y space-y-3 w-full max-w-md">
      <input className="input" maxLength={20} placeholder="Tu apodo" aria-label="Tu apodo" value={nick} onChange={(e) => setN(e.target.value)} />
      {!lockCode && (
        <input className="input uppercase tracking-widest text-center font-display" placeholder="MEME-XXXX" aria-label="Código de sala" value={code}
          onChange={(e) => setCode(e.target.value)} onBlur={() => code && setCode(normalizeCode(code))} />
      )}
      {err && <p className="text-red-400 font-bold text-center">{err}</p>}
      <button className="btn w-full !text-xl" disabled={busy} onClick={go}>{busy ? 'ENTRANDO...' : 'DALE, ENTRAR'}</button>
    </div>
  );
}
