import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Реестр клеток — Майами',
  description: 'Карта города, где место одновременно является рекламным местом.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
