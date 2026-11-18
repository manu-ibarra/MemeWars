'use client';
import { useEffect, useState } from 'react';
import { isMuted, setMuted } from '@/lib/sound';

export default function MuteToggle() {
  const [m, setM] = useState(false);
  useEffect(() => setM(isMuted()), []);
  return (
    <button
      aria-label={m ? 'Activar sonido' : 'Silenciar'}
      onClick={() => { setMuted(!m); setM(!m); }}
      className="fixed top-3 right-3 z-50 w-11 h-11 rounded-full bg-card border-[3px] border-line text-xl"
    >{m ? '🔇' : '🔊'}</button>
  );
}
