import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI Support Widget',
  description: 'Встраиваемый AI-чат поддержки с RAG по докам компании',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
