'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Logo from '@/components/Logo';
import ConfigBanner from '@/components/ConfigBanner';
import { createRoom } from '@/lib/game';
import { getNick, setNick, setPlayerId } from '@/lib/session';

const FLOATERS = ['😂', '🔥', '💀', '🤡', '😎', '👑', '🐸', '🤯'];
const STEPS = [
  { n: '1', t: 'Te llega un clip', d: 'Todos ven el mismo meme al mismo tiempo.' },
  { n: '2', t: 'Le ponés texto zarpado', d: 'Arrastrá, cambiá fuente y color. A pura creatividad.' },
  { n: '3', t: 'Votan y gana el más gracioso', d: 'Votos anónimos. El que suma más es el Rey del Meme.' },
];

export default function Landing() {
  const router = useRouter();
  const [nick, setN] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => setN(getNick()), []);

  const create = async () => {
    if (!nick.trim()) return setErr('Poné tu apodo primero, che');
    setBusy(true); setErr('');
    try {
      const { room, player } = await createRoom(nick);
      setNick(nick.trim());
      setPlayerId(room.code, player.id);
      router.push(`/room/${room.code}`);
    } catch {
      setErr('No pudimos crear la sala. ¿Está configurado Supabase?');
      setBusy(false);
    }
  };
  const join = () => {
    if (nick.trim()) setNick(nick.trim());
    router.push('/join');
  };

  return (
    <>
      <ConfigBanner />
      <div className="relative overflow-hidden">
        {FLOATERS.map((e, i) => (
          <span key={i} aria-hidden className="absolute text-4xl opacity-30 animate-floaty pointer-events-none"
            style={{ left: `${(i * 13 + 5) % 92}%`, top: `${(i * 23) % 70 + 3}%`, animationDelay: `${i * 0.6}s`, ['--r' as any]: `${i * 8}deg` }}>{e}</span>
        ))}
        <main className="relative max-w-3xl mx-auto px-4 py-10 flex flex-col items-center gap-8">
          <div className="animate-bounce-in" style={{ transform: 'rotate(-2deg)' }}>
            <Logo width={560} glow />
          </div>
          <p className="font-display text-brand text-center text-xl sm:text-2xl">EL JUEGO DONDE EL MEME MÁS ZARPADO GANA</p>
          <div className="w-full max-w-md space-y-3">
            <input className="input text-center text-lg" maxLength={20} placeholder="Tu apodo" aria-label="Tu apodo" value={nick} onChange={(e) => setN(e.target.value)} />
            {err && <p className="text-red-400 font-bold text-center">{err}</p>}
            <button className="btn w-full !text-2xl !py-5 !shadow-[4px_4px_0_#fff]" disabled={busy} onClick={create}>{busy ? 'CREANDO...' : 'CREAR SALA'}</button>
            <button className="btn btn-outline w-full !text-xl" onClick={join}>UNIRSE CON CÓDIGO</button>
          </div>
          <section className="w-full space-y-3">
            <h2 className="font-display text-2xl text-center">CÓMO SE JUEGA</h2>
            <div className="grid sm:grid-cols-3 gap-3">
              {STEPS.map((s) => (
                <div key={s.n} className="card-y text-center">
                  <div className="font-display text-4xl text-brand">{s.n}</div>
                  <div className="font-extrabold">{s.t}</div>
                  <p className="text-sm text-neutral-400 mt-1">{s.d}</p>
                </div>
              ))}
            </div>
          </section>
          <footer className="text-neutral-500 text-sm text-center pb-6">Hecho por amigos, para amigos - MEME WARS</footer>
        </main>
      </div>
    </>
  );
}
