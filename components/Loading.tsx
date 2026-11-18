import Logo from './Logo';
export default function Loading({ text = 'CARGANDO MEME...' }: { text?: string }) {
  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-6 p-6">
      <Logo width={260} pulse glow />
      <p className="font-display text-brand text-xl">{text}</p>
    </div>
  );
}
