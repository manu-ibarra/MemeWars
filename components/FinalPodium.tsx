'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import confetti from 'canvas-confetti';
import { Player, Room } from '@/types';
import Leaderboard from './Leaderboard';
import { Avatar } from './PlayerList';
import { playAgain } from '@/lib/game';
import { clearPlayerId } from '@/lib/session';
import { playSound } from '@/lib/sound';

export default function FinalPodium({ room, players, me }: { room: Room; players: Player[]; me: Player }) {
  const router = useRouter();
  const sorted = [...players].sort((a, b) => b.score - a.score);
  useEffect(() => {
    playSound('win');
    const end = Date.now() + 2500;
    (function frame() {
      confetti({ particleCount: 6, angle: 60, spread: 60, origin: { x: 0 }, colors: ['#FFE600', '#0A0A0A', '#FFFFFF'] });
      confetti({ particleCount: 6, angle: 120, spread: 60, origin: { x: 1 }, colors: ['#FFE600', '#0A0A0A', '#FFFFFF'] });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();
  }, []);
  const order = [sorted[1], sorted[0], sorted[2]];
  const heights = ['h-28', 'h-40', 'h-20'];
  const medals = ['🥈', '👑', '🥉'];
  return (
    <main className="max-w-2xl mx-auto p-4 space-y-6">
      <h2 className="font-display text-4xl text-brand text-center">¡FIN DEL JUEGO!</h2>
      <div className="flex items-end justify-center gap-2">
        {order.map((p, i) => p && (
          <div key={p.id} className="flex-1 flex flex-col items-center gap-2 text-center">
            {i === 1 && <div className="font-display text-brand text-sm">👑 REY DEL MEME</div>}
            <Avatar p={p} size={i === 1 ? 72 : 56} />
            <div className="font-extrabold truncate max-w-full">{p.nickname}</div>
            <div className={`w-full ${heights[i]} bg-brand text-black border-[3px] border-black rounded-t-2xl flex flex-col items-center justify-center font-display`}>
              <span className="text-3xl">{medals[i]}</span><span>{p.score} pts</span>
            </div>
          </div>
        ))}
      </div>
      <Leaderboard players={players} meId={me.id} />
      <div className="grid gap-3">
        {me.is_host && <button className="btn !text-xl" onClick={() => playAgain(room)}>JUGAR DE NUEVO</button>}
        <button className="btn btn-outline" onClick={() => { clearPlayerId(room.code); router.push('/'); }}>VOLVER AL INICIO</button>
        {!me.is_host && <p className="text-center text-sm text-neutral-400">El host puede arrancar otra partida en la misma sala</p>}
      </div>
    </main>
  );
}
