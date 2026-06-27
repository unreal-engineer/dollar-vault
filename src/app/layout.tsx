import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';
import AIAssistant from '@/components/AIAssistant';

export const metadata: Metadata = {
  title: 'Dollar Vault',
  description: 'Your premium local-first financial dashboard.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <Navbar />
        <main className="container">
          {children}
        </main>
        <AIAssistant />
      </body>
    </html>
  );
}
