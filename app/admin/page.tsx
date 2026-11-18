'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Logo from '@/components/Logo';
import { Meme, MemeType } from '@/types';
import { supabase, BUCKET } from '@/lib/supabase';
import { makeThumbnail } from '@/lib/meme-render';

const MAX_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_SECS = 15;
const OK_TYPES: Record<string, MemeType> = {
  'video/mp4': 'video', 'video/webm': 'video', 'image/gif': 'gif', 'image/jpeg': 'image', 'image/png': 'image',
};

function readDuration(file: File): Promise<number> {
  return new Promise((res, rej) => {
    const v = document.createElement('video');
    const url = URL.createObjectURL(file);
    v.preload = 'metadata';
    v.onloadedmetadata = () => { URL.revokeObjectURL(url); res(v.duration); };
    v.onerror = () => { URL.revokeObjectURL(url); rej(new Error('No pude leer el video')); };
    v.src = url;
  });
}

export default function Admin() {
  const [pw, setPw] = useState('');
  const [authed, setAuthed] = useState(false);
  const [loginErr, setLoginErr] = useState('');
  const [memes, setMemes] = useState<Meme[]>([]);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<'all' | MemeType>('all');
  const [toast, setToast] = useState('');

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState('');
  const [preset, setPreset] = useState<'topbottom' | 'top' | 'bottom'>('topbottom');
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [drag, setDrag] = useState(false);
  const inp = useRef<HTMLInputElement>(null);

  const headers = useCallback((p = pw) => ({ 'x-admin-password': p, 'Content-Type': 'application/json' }), [pw]);
  const say = (m: string) => { setToast(m); setTimeout(() => setToast(''), 2500); };

  const load = useCallback(async (p: string) => {
    const r = await fetch('/api/memes', { headers: headers(p) });
    if (r.status === 401) return 'bad';
    const j = await r.json();
    if (!r.ok) return j.error as string;
    setMemes(j.memes);
    return 'ok';
  }, [headers]);

  const login = async (p: string) => {
    setLoginErr('');
    const r = await load(p);
    if (r === 'ok') { try { sessionStorage.setItem('mw_admin', p); } catch { /* ignore */ } setAuthed(true); }
    else setLoginErr(r === 'bad' ? 'Contraseña incorrecta' : r);
  };
  useEffect(() => {
    try { const s = sessionStorage.getItem('mw_admin'); if (s) { setPw(s); login(s); } } catch { /* ignore */ }
  }, []); // eslint-disable-line

  const pick = async (f: File | undefined) => {
    setErr('');
    if (!f) return;
    const type = OK_TYPES[f.type];
    if (!type) return setErr('Formato no permitido (mp4, webm, gif, jpg, png)');
    if (f.size > MAX_BYTES) return setErr('Pesa más de 10MB. Tip: max 15s y 720p');
    if (type === 'video') {
      try { if ((await readDuration(f)) > MAX_VIDEO_SECS) return setErr('El video dura más de 15 segundos'); }
      catch (e: any) { return setErr(e.message); }
    }
    setFile(f); setPreview(URL.createObjectURL(f)); setTitle(f.name.replace(/\.[^.]+$/, ''));
  };

  const upload = async () => {
    if (!file) return;
    setBusy(true); setErr(''); setProgress(5);
    try {
      const type = OK_TYPES[file.type];
      const duration = type === 'video' ? await readDuration(file) : null;
      const thumb = await makeThumbnail(file, type);
      setProgress(15);
      const s = await (await fetch('/api/upload', { method: 'POST', headers: headers(), body: JSON.stringify({ action: 'sign', ext: file.name.split('.').pop() }) })).json();
      if (s.error) throw new Error(s.error);
      const t = await supabase.storage.from(BUCKET).uploadToSignedUrl(s.thumbPath, s.thumbToken, thumb, { contentType: 'image/jpeg' });
      if (t.error) throw t.error;
      setProgress(40);
      const f = await supabase.storage.from(BUCKET).uploadToSignedUrl(s.filePath, s.fileToken, file, { contentType: file.type });
      if (f.error) throw f.error;
      setProgress(85);
      const positions = {
        topbottom: { top: { x: 50, y: 8 }, bottom: { x: 50, y: 88 } },
        top: { top: { x: 50, y: 8 }, bottom: { x: 50, y: 20 } },
        bottom: { top: { x: 50, y: 78 }, bottom: { x: 50, y: 90 } },
      }[preset];
      const c = await (await fetch('/api/upload', {
        method: 'POST', headers: headers(),
        body: JSON.stringify({ action: 'commit', filePath: s.filePath, thumbPath: s.thumbPath, title, type, duration, positions, tags: tags.split(',').map((x) => x.trim()).filter(Boolean) }),
      })).json();
      if (c.error) throw new Error(c.error);
      setProgress(100);
      say('¡Clip subido! 🔥');
      setFile(null); setPreview(''); setTitle(''); setTags('');
      await load(pw);
    } catch (e: any) {
      setErr(e.message || 'Falló la subida');
    }
    setBusy(false); setTimeout(() => setProgress(0), 800);
  };

  const toggle = async (m: Meme) => {
    await fetch('/api/memes', { method: 'PATCH', headers: headers(), body: JSON.stringify({ id: m.id, is_active: !m.is_active }) });
    load(pw);
  };
  const del = async (m: Meme) => {
    if (!confirm(`¿Borrar "${m.title}"? No se puede deshacer.`)) return;
    await fetch('/api/memes', { method: 'DELETE', headers: headers(), body: JSON.stringify({ id: m.id }) });
    load(pw);
  };

  if (!authed) {
    return (
      <main className="min-h-[100dvh] flex flex-col items-center justify-center gap-5 p-4">
        <Link href="/"><Logo width={220} glow /></Link>
        <div className="card-y w-full max-w-sm space-y-3">
          <h1 className="font-display text-xl">ADMIN</h1>
          <input type="password" className="input" placeholder="Contraseña" aria-label="Contraseña" value={pw} onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && login(pw)} />
          {loginErr && <p className="text-red-400 font-bold">{loginErr}</p>}
          <button className="btn w-full" onClick={() => login(pw)}>ENTRAR</button>
        </div>
      </main>
    );
  }

  const shown = memes.filter((m) => (filter === 'all' || m.type === filter) && (`${m.title} ${(m.tags || []).join(' ')}`).toLowerCase().includes(q.toLowerCase()));
  const active = memes.filter((m) => m.is_active).length;

  return (
    <main className="max-w-5xl mx-auto p-4 space-y-6">
      <header className="flex items-center justify-between gap-3">
        <Link href="/"><Logo width={110} /></Link>
        <h1 className="font-display text-xl sm:text-3xl text-brand text-right">MI BIBLIOTECA DE MEMES</h1>
      </header>
      {toast && <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-brand text-black font-extrabold px-5 py-3 rounded-2xl border-[3px] border-black shadow-[4px_4px_0_#fff]">{toast}</div>}

      <section className="card-y space-y-3">
        <div
          onClick={() => inp.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files[0]); }}
          className={`rounded-2xl border-[3px] border-dashed border-brand p-6 text-center cursor-pointer font-bold ${drag ? 'bg-[#2a2500]' : ''}`}
        >
          {preview ? (
            OK_TYPES[file!.type] === 'video'
              ? <video src={preview} muted loop autoPlay playsInline className="max-h-56 mx-auto rounded-xl" />
              // eslint-disable-next-line @next/next/no-img-element
              : <img src={preview} alt="Vista previa" className="max-h-56 mx-auto rounded-xl" />
          ) : 'Arrastrá tu clip acá o hacé click'}
          <input ref={inp} type="file" hidden accept="video/mp4,video/webm,image/gif,image/jpeg,image/png" onChange={(e) => pick(e.target.files?.[0])} />
        </div>
        <p className="text-xs text-neutral-400">mp4, webm, gif, jpg, png · máx 10MB · videos de hasta 15s. Tip: 720p. Los clips viven en Supabase Storage; la base solo guarda la URL.</p>
        {file && (
          <>
            <input className="input" placeholder="Título" maxLength={100} value={title} onChange={(e) => setTitle(e.target.value)} />
            <input className="input" placeholder="Tags (separados por coma)" value={tags} onChange={(e) => setTags(e.target.value)} />
            <div className="flex gap-2 flex-wrap items-center">
              <span className="text-xs font-bold text-neutral-400">TEXTO POR DEFECTO</span>
              {([['topbottom', 'ARRIBA + ABAJO'], ['top', 'SOLO ARRIBA'], ['bottom', 'SOLO ABAJO']] as const).map(([k, t]) => (
                <button key={k} onClick={() => setPreset(k)} className={`chip ${preset === k ? 'chip-on' : ''}`}>{t}</button>
              ))}
            </div>
            {progress > 0 && <div className="h-4 rounded-full bg-ink border-[3px] border-line overflow-hidden"><div className="h-full bg-brand transition-all" style={{ width: `${progress}%` }} /></div>}
            <button className="btn w-full" disabled={busy} onClick={upload}>{busy ? 'SUBIENDO...' : 'SUBIR CLIP'}</button>
          </>
        )}
        {err && <p className="text-red-400 font-bold">{err}</p>}
      </section>

      <section className="space-y-3">
        <p className="font-extrabold">Tenés <span className="text-brand">{active}</span> clips activos para jugar</p>
        <div className="flex gap-2 flex-wrap">
          <input className="input flex-1 min-w-[160px]" placeholder="Buscar..." value={q} onChange={(e) => setQ(e.target.value)} />
          {(['all', 'video', 'gif', 'image'] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`chip ${filter === f ? 'chip-on' : ''}`}>{f === 'all' ? 'TODOS' : f === 'image' ? 'IMAGEN' : f.toUpperCase()}</button>
          ))}
        </div>
        {memes.length === 0 && <p className="text-neutral-400">Todavía no hay clips, subí el primero acá arriba.</p>}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {shown.map((m) => (
            <div key={m.id} className={`card !p-2 space-y-2 ${m.is_active ? '' : 'opacity-50'}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={m.thumbnail_url || m.media_url} alt={m.title || 'clip'} loading="lazy" className="w-full aspect-video object-cover rounded-xl" />
              <div className="font-extrabold truncate">{m.title}</div>
              <div className="flex gap-1 flex-wrap text-[11px] font-bold">
                <span className="bg-brand text-black rounded px-1.5">{m.type === 'image' ? 'IMAGEN' : m.type.toUpperCase()}</span>
                {m.duration_seconds ? <span className="bg-line rounded px-1.5">{m.duration_seconds}s</span> : null}
                {(m.tags || []).map((t) => <span key={t} className="bg-line rounded px-1.5">#{t}</span>)}
              </div>
              <div className="flex gap-2">
                <button className={`chip flex-1 ${m.is_active ? 'chip-on' : ''}`} onClick={() => toggle(m)}>{m.is_active ? 'ACTIVO' : 'INACTIVO'}</button>
                <button className="chip !border-red-500 text-red-400" aria-label="Borrar" onClick={() => del(m)}>🗑</button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
