import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MEME WARS',
  description: 'El juego donde el meme más zarpado gana',
  manifest: '/manifest.json',
  icons: { icon: '/icon.png', apple: '/icon.png' },
};
export const viewport: Viewport = { themeColor: '#FFE600', width: 'device-width', initialScale: 1, maximumScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Anton&family=Bungee&family=Inter:wght@400;600;800&family=Luckiest+Guy&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
