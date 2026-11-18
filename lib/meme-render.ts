import { FontKey, TextLayer } from '@/types';

// Fonts are sized relative to a 640px wide meme, so the editor and canvas match at any size
export const REF_WIDTH = 640;
export const OUT_W = 1280;
export const OUT_H = 720; // 16:9, same as the editor (object-cover)

export const FONT_STACKS: Record<FontKey, string> = {
  impact: 'Impact, Anton, "Arial Narrow", sans-serif',
  bungee: 'Bungee, "Arial Black", sans-serif',
  luckiest: '"Luckiest Guy", "Arial Black", sans-serif',
  arial: '"Arial Black", "Arial Bold", Arial, sans-serif',
};

export function layerText(l: TextLayer) {
  return l.uppercase ? l.text.toUpperCase() : l.text;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => res(img);
    img.onerror = () => rej(new Error('image load failed'));
    img.src = url;
  });
}

function loadVideoFrame(url: string): Promise<HTMLVideoElement> {
  return new Promise((res, rej) => {
    const v = document.createElement('video');
    v.crossOrigin = 'anonymous';
    v.muted = true;
    v.playsInline = true;
    v.preload = 'auto';
    const timer = setTimeout(() => rej(new Error('video timeout')), 8000);
    v.onloadedmetadata = () => {
      // capture frame at 1s (or middle for very short clips)
      v.currentTime = Math.min(1, (v.duration || 2) / 2);
    };
    v.onseeked = () => { clearTimeout(timer); res(v); };
    v.onerror = () => { clearTimeout(timer); rej(new Error('video load failed')); };
    v.src = url;
  });
}

// object-cover into W x H
function drawCover(ctx: CanvasRenderingContext2D, src: CanvasImageSource, sw: number, sh: number, W: number, H: number) {
  const s = Math.max(W / sw, H / sh);
  const dw = sw * s, dh = sh * s;
  ctx.drawImage(src, (W - dw) / 2, (H - dh) / 2, dw, dh);
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const out: string[] = [];
  for (const para of text.split('\n')) {
    let line = '';
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const test = line ? line + ' ' + word : word;
      if (ctx.measureText(test).width > maxW && line) { out.push(line); line = word; }
      else line = test;
    }
    out.push(line);
  }
  return out;
}

export function drawLayers(ctx: CanvasRenderingContext2D, layers: TextLayer[], W: number, H: number) {
  const k = W / REF_WIDTH;
  for (const l of layers) {
    const text = layerText(l).trim();
    if (!text) continue;
    const size = l.fontSize * k;
    ctx.save();
    ctx.font = `${size}px ${FONT_STACKS[l.fontFamily]}`;
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = l.opacity / 100;
    const lines = wrapLines(ctx, text, W * 0.9);
    const lh = size * 1.1;
    const blockW = Math.max(...lines.map((s) => ctx.measureText(s).width));
    const cx = (l.x / 100) * W, cy = (l.y / 100) * H;
    ctx.translate(cx, cy);
    ctx.rotate((l.rotation * Math.PI) / 180);
    lines.forEach((line, i) => {
      const y = (i - (lines.length - 1) / 2) * lh;
      const w = ctx.measureText(line).width;
      const x = l.align === 'left' ? -blockW / 2 : l.align === 'right' ? blockW / 2 - w : -w / 2;
      ctx.textAlign = 'left';
      if (l.strokeWidth > 0) {
        ctx.lineWidth = l.strokeWidth * 2 * k;
        ctx.strokeStyle = l.strokeColor;
        ctx.strokeText(line, x, y);
      }
      ctx.fillStyle = l.color;
      ctx.fillText(line, x, y);
    });
    ctx.restore();
  }
}

export async function ensureFonts() {
  try {
    await Promise.all(
      ['Bungee', 'Luckiest Guy', 'Anton'].map((f) => document.fonts.load(`40px "${f}"`, 'ABC'))
    );
  } catch { /* ignore */ }
}

/** Composites media + text layers into a JPEG blob. Throws if canvas is tainted/unavailable. */
export async function renderMemeToImage(
  mediaUrl: string,
  type: 'image' | 'video' | 'gif',
  layers: TextLayer[]
): Promise<Blob> {
  await ensureFonts();
  const canvas = document.createElement('canvas');
  canvas.width = OUT_W;
  canvas.height = OUT_H;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, OUT_W, OUT_H);
  if (type === 'video') {
    const v = await loadVideoFrame(mediaUrl);
    drawCover(ctx, v, v.videoWidth, v.videoHeight, OUT_W, OUT_H);
    v.removeAttribute('src');
  } else {
    const img = await loadImage(mediaUrl);
    drawCover(ctx, img, img.naturalWidth, img.naturalHeight, OUT_W, OUT_H);
  }
  drawLayers(ctx, layers, OUT_W, OUT_H);
  return new Promise((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error('toBlob failed'))), 'image/jpeg', 0.85)
  );
}

/** Thumbnail (320 wide) for admin uploads */
export async function makeThumbnail(file: File, type: 'image' | 'video' | 'gif'): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 480; canvas.height = 270;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 480, 270);
    if (type === 'video') {
      const v = await loadVideoFrame(url);
      drawCover(ctx, v, v.videoWidth, v.videoHeight, 480, 270);
    } else {
      const img = await loadImage(url);
      drawCover(ctx, img, img.naturalWidth, img.naturalHeight, 480, 270);
    }
    return await new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('thumb'))), 'image/jpeg', 0.8));
  } finally {
    URL.revokeObjectURL(url);
  }
}
