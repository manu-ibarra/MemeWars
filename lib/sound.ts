// Tiny Web Audio beeps with a mute toggle
let ctx: AudioContext | null = null;

export function isMuted(): boolean {
  try { return localStorage.getItem('mw_muted') === '1'; } catch { return false; }
}
export function setMuted(m: boolean) {
  try { localStorage.setItem('mw_muted', m ? '1' : '0'); } catch { /* ignore */ }
}

function beep(freq: number, dur: number, delay = 0, type: OscillatorType = 'square', vol = 0.08) {
  try {
    ctx = ctx || new (window.AudioContext || (window as any).webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.value = vol;
    o.connect(g); g.connect(ctx.destination);
    const t = ctx.currentTime + delay;
    o.start(t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.stop(t + dur);
  } catch { /* audio not available */ }
}

export function playSound(kind: 'vote' | 'tick' | 'end' | 'win') {
  if (isMuted()) return;
  if (kind === 'vote') { beep(660, 0.1); beep(880, 0.12, 0.08); }
  if (kind === 'tick') beep(1000, 0.05, 0, 'sine', 0.05);
  if (kind === 'end') { beep(300, 0.25, 0, 'sawtooth'); beep(200, 0.35, 0.2, 'sawtooth'); }
  if (kind === 'win') [523, 659, 784, 1046].forEach((f, i) => beep(f, 0.18, i * 0.12));
}
