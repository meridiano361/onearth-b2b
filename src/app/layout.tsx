import type { Metadata, Viewport } from 'next';
import { Nunito } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import Providers from '@/components/layout/Providers';
import './globals.css';

const nunito = Nunito({
  subsets: ['latin'],
  weight: ['200', '300', '400', '500', '600', '700'],
  variable: '--font-nunito',
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#000000',
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: {
    template: '%s | ON EARTH B2B',
    default: 'ON EARTH B2B — CASA 2027',
  },
  description: 'Piattaforma ordini B2B On Earth Collezione CASA 2027',
  robots: 'noindex, nofollow',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'ON EARTH',
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it" className={nunito.variable}>
      <body>
        <Providers>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: '#000000',
                color: '#FFFFFF',
                borderRadius: '4px',
                fontSize: '13px',
                fontFamily: 'Nunito, sans-serif',
                fontWeight: '400',
                letterSpacing: '0.03em',
                padding: '12px 16px',
                boxShadow: '0 4px 24px rgba(0,0,0,0.16)',
              },
              success: {
                iconTheme: {
                  primary: '#ACA39A',
                  secondary: '#000000',
                },
              },
              error: {
                iconTheme: {
                  primary: '#EF4444',
                  secondary: '#FFFFFF',
                },
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
