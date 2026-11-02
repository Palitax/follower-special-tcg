import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ManaCards · Giveaway Overlay Studio',
  description: 'Transparentes OBS Giveaway Overlay & Regie-Studio für Whatnot Streams.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'ManaCards Overlay',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#090a0f',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de" className="dark h-full w-full">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="h-full w-full text-white antialiased">
        {children}
      </body>
    </html>
  );
}
