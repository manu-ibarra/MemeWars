import { Player } from '@/types';
import { Avatar } from './PlayerList';

export default function Leaderboard({ players, meId, gains }: { players: Player[]; meId?: string; gains?: Record<string, number> }) {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  return (
    <ol className="space-y-2">
      {sorted.map((p, i) => (
        <li key={p.id} className={`card flex items-center gap-3 !p-3 ${i === 0 ? '!border-brand shadow-hardsm' : ''} ${p.id === meId ? 'bg-[#242000]' : ''}`}>
          <div className="w-8 text-center font-display text-xl">{i === 0 ? '👑' : i + 1}</div>
          <Avatar p={p} size={40} />
          <div className="flex-1 min-w-0 font-extrabold truncate">{p.nickname}</div>
          {gains && gains[p.id] ? <span className="text-green-400 font-extrabold text-sm">+{gains[p.id]}</span> : null}
          <div className="font-display text-brand text-xl">{p.score}</div>
        </li>
      ))}
    </ol>
  );
}
