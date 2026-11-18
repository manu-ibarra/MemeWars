'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Logo from '@/components/Logo';
import ConfigBanner from '@/components/ConfigBanner';
import { createRoom } from '@/lib/game';
import { getNick, setNick, setPlayerId } from '@/lib/session';

const STEPS = [
  { n: '01', t: 'Llega un clip', d: 'Todos ven el mismo meme al mismo tiempo.' },
  { n: '02', t: 'Le ponés texto', d: 'Arrastrá, cambiá fuente y color.' },
  { n: '03', t: 'Votan', d: 'Votos anónimos. Gana el más gracioso.' },
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
      <main className="min-h-[100dvh] flex flex-col items-center justify-center px-6 py-16 text-center">
        <div className="w-full max-w-sm flex flex-col items-center gap-10">
          <div className="animate-bounce-in flex flex-col items-center gap-5">
            <Logo width={420} glow />
            <p className="eyebrow">El juego donde el meme más zarpado gana</p>
          </div>

          <div className="w-full space-y-3 animate-slide-up" style={{ animationDelay: '200ms' }}>
            <input className="input text-center" maxLength={20} placeholder="Tu apodo" aria-label="Tu apodo" value={nick} onChange={(e) => setN(e.target.value)} />
            {err && <p className="text-red-400 text-sm">{err}</p>}
            <button className="btn w-full" disabled={busy} onClick={create}>{busy ? 'Creando...' : 'Crear sala'}</button>
            <button className="btn btn-outline w-full" onClick={join}>Unirse con código</button>
            <Link href="/admin" className="btn btn-ghost w-full" aria-label="Agregar clips al juego">
              <span className="text-brand text-base leading-none">+</span> Agregar clips
            </Link>
          </div>
        </div>

        <section className="w-full max-w-2xl mt-24 animate-slide-up" style={{ animationDelay: '400ms' }}>
          <h2 className="eyebrow mb-8">Cómo se juega</h2>
          <div className="grid sm:grid-cols-3 gap-y-8 sm:gap-x-8 sm:divide-x divide-white/10">
            {STEPS.map((s) => (
              <div key={s.n} className="sm:px-4">
                <div className="text-brand text-sm font-medium tabular-nums">{s.n}</div>
                <div className="font-display text-lg mt-2">{s.t}</div>
                <p className="text-sm text-white/45 mt-1">{s.d}</p>
              </div>
            ))}
          </div>
        </section>

        <footer className="mt-24 eyebrow !text-white/25 !tracking-[0.15em]">Hecho por amigos, para amigos</footer>
      </main>
    </>
  );
}
