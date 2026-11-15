import type { Metadata } from 'next';
import { Playfair_Display, DM_Sans } from 'next/font/google';
import './globals.css';
import { Logo, Cherry } from '@/components/brand/Brand';

const display = Playfair_Display({
  subsets: ['latin'],
  weight: ['600', '700', '800', '900'],
  variable: '--font-display',
  display: 'swap',
});

const sans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Cake Game — Perishable Supply Chain',
  description: 'A multiplayer supply chain simulation with perishable inventory.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body className="min-h-screen bg-cream-50 font-sans flex flex-col">
        <header>
          <div className="bg-forest-900 border-t-[3px] border-cake-600">
            <div className="max-w-5xl mx-auto px-6 py-3">
              <Logo tone="dark" size={40} />
            </div>
          </div>
          <div className="drip -mt-px" aria-hidden="true" />
        </header>
        <main className="max-w-5xl w-full mx-auto px-4 py-8 flex-1">
          {children}
        </main>
        <footer className="border-t border-cream-200 py-5 text-center text-xs text-gray-400">
          <span className="inline-flex items-center gap-1.5">
            <Cherry size={14} />
            Cake Game · a perishable supply chain simulation
          </span>
        </footer>
      </body>
    </html>
  );
}
