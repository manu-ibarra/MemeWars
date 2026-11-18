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
      className="fixed bottom-4 left-4 z-50 w-11 h-11 rounded-full bg-white/5 backdrop-blur border border-white/10 text-base"
    >{m ? '🔇' : '🔊'}</button>
  );
}
