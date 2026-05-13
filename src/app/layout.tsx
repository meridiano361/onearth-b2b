import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import Providers from '@/components/layout/Providers';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    template: '%s | ON EARTH B2B',
    default: 'ON EARTH B2B — CASA 2027',
  },
  description: 'B2B ordering platform for ON EARTH collection CASA 2027 by Meridiano 361',
  robots: 'noindex, nofollow',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <Providers>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: '#1C1C1C',
                color: '#FAFAF7',
                borderRadius: '4px',
                fontSize: '13px',
                fontFamily: 'Inter, sans-serif',
                padding: '12px 16px',
                boxShadow: '0 4px 24px rgba(28,28,28,0.16)',
              },
              success: {
                iconTheme: {
                  primary: '#C4A882',
                  secondary: '#1C1C1C',
                },
              },
              error: {
                iconTheme: {
                  primary: '#EF4444',
                  secondary: '#FAFAF7',
                },
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
