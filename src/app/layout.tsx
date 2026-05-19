import type { Metadata, Viewport } from 'next';
import { Nunito } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import ToasterWrapper from '@/components/layout/ToasterWrapper';
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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} className={nunito.variable}>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers>
            {children}
            <ToasterWrapper />
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
