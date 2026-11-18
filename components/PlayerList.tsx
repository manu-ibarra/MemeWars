import { Player } from '@/types';

export function Avatar({ p, size = 48 }: { p: Pick<Player, 'nickname' | 'avatar_color' | 'avatar_emoji'>; size?: number }) {
  return (
    <div
      className="relative shrink-0 rounded-full border-[3px] border-black flex items-center justify-center font-display text-black"
      style={{ width: size, height: size, background: p.avatar_color || '#FFE600', fontSize: size * 0.4 }}
    >
      {p.nickname.slice(0, 2).toUpperCase()}
      {p.avatar_emoji && <span className="absolute -bottom-1 -right-1" style={{ fontSize: size * 0.4 }}>{p.avatar_emoji}</span>}
    </div>
  );
}

export default function PlayerList({ players, meId, presentIds }: { players: Player[]; meId?: string; presentIds?: Set<string> }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {players.map((p) => {
        const away = presentIds && presentIds.size > 0 && !presentIds.has(p.id);
        return (
          <div key={p.id} className={`card flex items-center gap-3 animate-slide-up ${p.id === meId ? '!border-brand' : ''} ${away ? 'opacity-50' : ''}`}>
            <Avatar p={p} />
            <div className="min-w-0 flex-1">
              <div className="font-extrabold truncate">{p.nickname}{p.id === meId && ' (vos)'}</div>
              <div className="flex gap-1 flex-wrap mt-1">
                {p.is_host && <span className="text-[11px] font-extrabold bg-brand text-black rounded-md px-1.5">👑 HOST</span>}
                {p.is_ready && !p.is_host && <span className="text-[11px] font-extrabold bg-green-400 text-black rounded-md px-1.5">LISTO</span>}
                {away && <span className="text-[11px] text-neutral-400">desconectado</span>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
