import type { Metadata, Viewport } from 'next';
import { Fraunces, Inter } from 'next/font/google';
import { AccessGate } from '@/components/AccessGate';
import './globals.css';

const display = Fraunces({ subsets: ['latin'], variable: '--font-display', axes: ['opsz'] });
const body = Inter({ subsets: ['latin'], variable: '--font-body' });

export const metadata: Metadata = {
  title: 'Room to Shop — design your space, shop the look',
  description:
    'Upload a photo of your room, clear it out, try new furniture with AI or real products, and shop every piece.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#f7f4ef',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>
        {children}
        <AccessGate />
      </body>
    </html>
  );
}
