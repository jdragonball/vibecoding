import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'YouTube Clone',
  description: 'A YouTube clone built with Next.js and TypeScript',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className={inter.className}>
        <Header />
        <div className="flex pt-14">
          <Sidebar />
          {children}
        </div>
      </body>
    </html>
  );
}
