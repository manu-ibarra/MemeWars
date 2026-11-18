// Uses the provided /public/logo.png as is (never recreated with text)
export default function Logo({ className = '', width = 200, glow = false, pulse = false }: { className?: string; width?: number; glow?: boolean; pulse?: boolean }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo.png"
      alt="MEME WARS"
      width={width}
      draggable={false}
      style={{ width, height: 'auto', filter: glow ? 'drop-shadow(0 0 24px rgba(255,230,0,.55))' : undefined }}
      className={`select-none max-w-full ${pulse ? 'animate-logo-pulse' : ''} ${className}`}
    />
  );
}
