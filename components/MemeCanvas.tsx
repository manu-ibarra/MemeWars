'use client';
import { useEffect, useRef, useState } from 'react';
import { Meme, TextLayer } from '@/types';
import { FONT_STACKS, REF_WIDTH, layerText } from '@/lib/meme-render';

/** Measures container width so font sizes scale like the canvas does */
export function useWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(REF_WIDTH);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return { ref, w };
}

export function Media({ meme }: { meme: Pick<Meme, 'media_url' | 'type'> }) {
  if (meme.type === 'video') {
    return <video src={meme.media_url} autoPlay loop muted playsInline preload="auto" className="absolute inset-0 w-full h-full object-cover pointer-events-none" />;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={meme.media_url} alt="Meme" draggable={false} className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none" />;
}

export function layerStyle(l: TextLayer, w: number): React.CSSProperties {
  const k = w / REF_WIDTH;
  return {
    position: 'absolute', left: `${l.x}%`, top: `${l.y}%`,
    transform: `translate(-50%,-50%) rotate(${l.rotation}deg)`,
    fontFamily: FONT_STACKS[l.fontFamily], fontSize: l.fontSize * k, lineHeight: 1.1,
    color: l.color, textAlign: l.align, opacity: l.opacity / 100,
    WebkitTextStroke: l.strokeWidth ? `${l.strokeWidth * 2 * k}px ${l.strokeColor}` : undefined,
    paintOrder: 'stroke fill', width: 'max-content', maxWidth: '90%', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
  };
}

/** Static meme: the rendered JPEG, or (fallback) layers drawn with HTML over the media */
export default function MemeCanvas({ meme, layers, renderedUrl, className = '' }: {
  meme: Pick<Meme, 'media_url' | 'type'> | null; layers?: TextLayer[] | null; renderedUrl?: string | null; className?: string;
}) {
  const { ref, w } = useWidth();
  return (
    <div ref={ref} className={`relative aspect-video w-full overflow-hidden rounded-2xl border-[3px] border-brand bg-black ${className}`}>
      {renderedUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={renderedUrl} alt="Meme enviado" className="absolute inset-0 w-full h-full object-cover" draggable={false} />
      ) : (
        <>
          {meme && <Media meme={meme} />}
          {(layers || []).filter((l) => l.text.trim()).map((l) => <div key={l.id} style={layerStyle(l, w)}>{layerText(l)}</div>)}
        </>
      )}
    </div>
  );
}
