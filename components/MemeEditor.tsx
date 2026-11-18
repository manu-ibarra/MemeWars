'use client';
import { useEffect, useRef, useState } from 'react';
import { FontKey, Meme, TextLayer } from '@/types';
import { Media, layerStyle, useWidth } from './MemeCanvas';
import { layerText } from '@/lib/meme-render';

const MAX_LAYERS = 3;
const FONTS: { key: FontKey; label: string }[] = [
  { key: 'impact', label: 'IMPACT' }, { key: 'bungee', label: 'BUNGEE' },
  { key: 'luckiest', label: 'LUCKIEST GUY' }, { key: 'arial', label: 'ARIAL BLACK' },
];
const COLORS = ['#FFFFFF', '#FFE600', '#000000'];

function freshLayer(i: number): TextLayer {
  return {
    id: `l${Date.now()}${i}`, text: '', x: 50, y: 50, fontSize: 44, fontFamily: 'impact', color: '#FFFFFF',
    strokeWidth: 4, strokeColor: '#000000', uppercase: true, align: 'center', rotation: 0, opacity: 100,
  };
}

interface Props {
  meme: Pick<Meme, 'media_url' | 'type'>;
  layers: TextLayer[];
  onChange: (l: TextLayer[]) => void;
  disabled?: boolean;
}

/** Live editor: what you see IS what gets rendered to canvas (same % positions, same font scale). */
export default function MemeEditor({ meme, layers, onChange, disabled }: Props) {
  const { ref, w } = useWidth();
  const [selected, setSelected] = useState<string>(layers[0]?.id);
  const [editing, setEditing] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const drag = useRef<{ id: string; sx: number; sy: number; ox: number; oy: number; moved: boolean } | null>(null);
  const sel = layers.find((l) => l.id === selected) || layers[0];

  useEffect(() => {
    if (!layers.find((l) => l.id === selected)) setSelected(layers[0]?.id);
  }, [layers, selected]);

  const patch = (id: string, p: Partial<TextLayer>) => onChange(layers.map((l) => (l.id === id ? { ...l, ...p } : l)));

  // ---- drag with pointer events (mouse + touch + pen) ----
  const onDown = (e: React.PointerEvent, l: TextLayer) => {
    if (disabled || editing === l.id) return;
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setSelected(l.id);
    drag.current = { id: l.id, sx: e.clientX, sy: e.clientY, ox: l.x, oy: l.y, moved: false };
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const dx = e.clientX - d.sx, dy = e.clientY - d.sy;
    if (Math.abs(dx) + Math.abs(dy) > 4) d.moved = true;
    if (!d.moved) return;
    const x = Math.max(0, Math.min(100, d.ox + (dx / r.width) * 100));
    const y = Math.max(0, Math.min(100, d.oy + (dy / r.height) * 100));
    patch(d.id, { x, y });
  };
  const onUp = () => {
    const d = drag.current;
    drag.current = null;
    if (d && !d.moved) setTimeout(() => inputRef.current?.focus(), 0); // tap = focus the text input
  };

  const addLayer = () => {
    if (layers.length >= MAX_LAYERS) return;
    const l = freshLayer(layers.length);
    onChange([...layers, l]);
    setSelected(l.id);
  };
  const removeLayer = (id: string) => {
    if (layers.length <= 1) { patch(id, { text: '' }); return; }
    onChange(layers.filter((l) => l.id !== id));
  };
  const reset = () => {
    if (!sel) return;
    const idx = layers.indexOf(sel);
    const y = idx === 0 ? 10 : idx === 1 ? 90 : 50;
    patch(sel.id, { x: 50, y, rotation: 0, fontSize: 44, opacity: 100 });
  };

  return (
    <div className="space-y-3">
      <div
        ref={ref}
        className="relative aspect-video w-full overflow-hidden rounded-2xl border-[3px] border-brand bg-black touch-none"
        onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
        onPointerDown={() => !disabled && setEditing(null)}
      >
        <Media meme={meme} />
        {layers.map((l) => {
          const isSel = l.id === sel?.id && !disabled;
          const empty = !l.text.trim();
          return (
            <div
              key={l.id}
              role="button"
              aria-label="Capa de texto"
              onPointerDown={(e) => onDown(e, l)}
              onDoubleClick={() => !disabled && setEditing(l.id)}
              style={{ ...layerStyle(l, w), touchAction: 'none', cursor: disabled ? 'default' : 'grab', padding: '2px 6px', ...(empty ? { opacity: 0.45, WebkitTextStroke: undefined } : {}) }}
              className={isSel ? 'outline outline-2 outline-dashed outline-brand' : ''}
            >
              {editing === l.id ? (
                <textarea
                  autoFocus value={l.text} rows={1}
                  onChange={(e) => patch(l.id, { text: e.target.value })}
                  onBlur={() => setEditing(null)}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="bg-transparent outline-none resize-none text-center"
                  style={{ font: 'inherit', color: 'inherit', width: '100%', minWidth: 120 }}
                />
              ) : empty ? <span style={{ WebkitTextStroke: 0 as any }}>{layers.indexOf(l) === 0 ? 'ARRIBA' : layers.indexOf(l) === 1 ? 'ABAJO' : 'TEXTO'}</span> : layerText(l)}
              {isSel && (
                <button
                  aria-label="Borrar texto"
                  onPointerDown={(e) => { e.stopPropagation(); removeLayer(l.id); }}
                  className="absolute -top-4 -right-4 w-8 h-8 rounded-full bg-red-500 text-white border-2 border-black text-sm font-extrabold leading-none"
                  style={{ WebkitTextStroke: 0 as any }}
                >✕</button>
              )}
            </div>
          );
        })}
      </div>

      {!disabled && sel && (
        <div className="card space-y-3">
          <div className="flex gap-2 flex-wrap items-center">
            {layers.map((l, i) => (
              <button key={l.id} onClick={() => setSelected(l.id)} className={`chip ${l.id === sel.id ? 'chip-on' : ''}`}>
                {i === 0 ? 'ARRIBA' : i === 1 ? 'ABAJO' : 'LIBRE'}
              </button>
            ))}
            {layers.length < MAX_LAYERS && <button onClick={addLayer} className="chip !border-brand text-brand">+ TEXTO</button>}
          </div>

          <textarea
            ref={inputRef} rows={2} maxLength={120} value={sel.text}
            onChange={(e) => patch(sel.id, { text: e.target.value })}
            placeholder="Escribí algo zarpado..." aria-label="Texto"
            className="input resize-none"
          />

          <label className="block text-xs font-bold text-neutral-400">TAMAÑO: {sel.fontSize}
            <input type="range" min={16} max={80} value={sel.fontSize} onChange={(e) => patch(sel.id, { fontSize: +e.target.value })} />
          </label>

          <div className="grid grid-cols-2 gap-2">
            {FONTS.map((f) => (
              <button key={f.key} onClick={() => patch(sel.id, { fontFamily: f.key })} className={`chip ${sel.fontFamily === f.key ? 'chip-on' : ''}`}>{f.label}</button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-neutral-400">COLOR</span>
            {COLORS.map((c) => (
              <button key={c} aria-label={`Color ${c}`} onClick={() => patch(sel.id, { color: c, strokeColor: c === '#000000' ? '#FFFFFF' : '#000000' })}
                className={`w-11 h-11 rounded-full border-[3px] ${sel.color === c ? 'border-brand scale-110' : 'border-line'}`} style={{ background: c }} />
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => patch(sel.id, { strokeWidth: sel.strokeWidth > 0 ? 0 : 4 })} className={`chip ${sel.strokeWidth > 0 ? 'chip-on' : ''}`}>
              BORDE {sel.strokeWidth > 0 ? 'ON' : 'OFF'}
            </button>
            <input type="range" min={0} max={8} value={sel.strokeWidth} aria-label="Grosor del borde" onChange={(e) => patch(sel.id, { strokeWidth: +e.target.value })} />
          </div>

          <div className="flex gap-2 flex-wrap">
            {(['left', 'center', 'right'] as const).map((a) => (
              <button key={a} onClick={() => patch(sel.id, { align: a })} className={`chip ${sel.align === a ? 'chip-on' : ''}`}>
                {a === 'left' ? '⬅ IZQ' : a === 'center' ? 'CENTRO' : 'DER ➡'}
              </button>
            ))}
            <button onClick={() => patch(sel.id, { uppercase: !sel.uppercase })} className={`chip ${sel.uppercase ? 'chip-on' : ''}`}>MAYÚS</button>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button className="chip" onClick={() => patch(sel.id, { y: 10 })}>ARRIBA</button>
            <button className="chip" onClick={() => patch(sel.id, { y: 50 })}>MEDIO</button>
            <button className="chip" onClick={() => patch(sel.id, { y: 90 })}>ABAJO</button>
            <button className="chip" onClick={() => patch(sel.id, { x: 50 })}>CENTRAR</button>
            <button className="chip" onClick={reset}>RESETEAR</button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs font-bold text-neutral-400">OPACIDAD: {sel.opacity}
              <input type="range" min={0} max={100} value={sel.opacity} onChange={(e) => patch(sel.id, { opacity: +e.target.value })} />
            </label>
            <label className="block text-xs font-bold text-neutral-400">ROTACIÓN: {sel.rotation}°
              <input type="range" min={-45} max={45} value={sel.rotation} onChange={(e) => patch(sel.id, { rotation: +e.target.value })} />
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
