import type { Metadata, Viewport } from 'next';
import { Alegreya_Sans, Cinzel } from 'next/font/google';
import './globals.css';

// Fantasy display serif (carved inscriptions) + humanist storybook sans (readable copy)
const cinzel = Cinzel({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800', '900'],
  variable: '--font-cinzel',
  display: 'swap',
});

const alegreyaSans = Alegreya_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-alegreya-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'ManaCards · Giveaway Overlay Studio',
  description: 'Transparente OBS Browser-Quelle & Regie-Studio für Whatnot Booster- und Karten-Giveaways.',
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
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de" className={`h-full w-full ${cinzel.variable} ${alegreyaSans.variable}`}>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="h-full w-full antialiased">
        {children}
      </body>
    </html>
  );
}
