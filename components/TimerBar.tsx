'use client';
import { useEffect, useRef } from 'react';
import { playSound } from '@/lib/sound';

export default function TimerBar({ remainingMs, totalSec }: { remainingMs: number; totalSec: number }) {
  const secs = Math.ceil(remainingMs / 1000);
  const pct = Math.max(0, Math.min(100, (remainingMs / (totalSec * 1000)) * 100));
  const danger = secs <= 10;
  const last = useRef(-1);
  useEffect(() => {
    if (secs !== last.current) {
      if (danger && secs > 0 && last.current !== -1) playSound('tick');
      if (secs === 0 && last.current > 0) playSound('end');
      last.current = secs;
    }
  }, [secs, danger]);
  return (
    <div className="w-full" role="timer" aria-label={`${secs} segundos`}>
      <div className="h-5 rounded-full border-[3px] border-line bg-ink overflow-hidden">
        <div
          className={`h-full transition-[width] duration-200 ease-linear ${danger ? 'bg-red-500' : 'bg-brand'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className={`text-right font-display text-lg mt-1 ${danger ? 'text-red-500' : 'text-brand'}`}>{secs}s</div>
    </div>
  );
}
