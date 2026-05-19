'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { FileDown } from 'lucide-react';

export default function CustomerHome() {
  const { data: session } = useSession();
  const companyName = session?.user?.companyName ?? '';
  const t = useTranslations('home');

  return (
    <div className="min-h-screen bg-cream">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 space-y-10">

        {/* Section 1 — Welcome */}
        <section>
          <h1 className="text-2xl font-bold text-primary tracking-tight">
            {t('greeting')}{companyName ? `, ${companyName}` : ''}!
          </h1>
          <p className="text-xs uppercase tracking-widest text-gray-400 mt-1">CASA 2027</p>

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <Link
              href="/catalog"
              className="flex-1 flex items-center justify-center py-4 text-sm font-semibold bg-primary text-white rounded border border-primary hover:bg-primary/90 transition-colors"
            >
              {t('goCatalog')}
            </Link>
            <Link
              href="/catalog/orders"
              className="flex-1 flex items-center justify-center py-4 text-sm font-semibold bg-white text-primary rounded border border-primary hover:bg-cream transition-colors"
            >
              {t('myOrders')}
            </Link>
          </div>
        </section>

        {/* Section 2 — Condizioni Commerciali */}
        <section className="bg-white border border-border rounded-lg p-5">
          <p className="text-xs uppercase tracking-widest text-gray-400 mb-2">{t('termsTitle')}</p>
          <p className="text-sm text-gray-600">
            {t('termsText')}{' '}
            <a
              href="mailto:e.mazzolari@meridiano361.it"
              className="text-accent hover:underline font-medium"
            >
              {t('termsLink')}
            </a>
          </p>
        </section>

        {/* Section 3 — Tempistiche di Ordine */}
        <section className="bg-white border border-border rounded-lg p-5">
          <p className="text-xs uppercase tracking-widest text-gray-400 mb-2">{t('timingTitle')}</p>
          <p className="text-sm text-gray-600">{t('timingText')}</p>
        </section>

        {/* Section 4 — Catalogo PDF */}
        <section className="bg-white border border-border rounded-lg p-5">
          <p className="text-xs uppercase tracking-widest text-gray-400 mb-3">{t('catalogTitle')}</p>
          <a
            href="#"
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-primary text-white rounded hover:bg-primary/90 transition-colors"
          >
            <FileDown size={15} />
            {t('catalogButton')}
          </a>
        </section>

        {/* Section 5 — Scopri ON EARTH */}
        <section>
          <p className="text-xs uppercase tracking-widest text-gray-400 mb-3">{t('discoverTitle')}</p>
          <Link
            href="https://www.on-earth.it"
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full bg-primary text-white text-center py-8 rounded hover:bg-primary/90 transition-colors"
          >
            <span className="text-sm font-medium tracking-wide">www.on-earth.it →</span>
          </Link>
        </section>

        {/* Section 6 — Il nostro Podcast */}
        <section>
          <p className="text-xs uppercase tracking-widest text-gray-400 mb-3">{t('podcastTitle')}</p>
          <iframe
            src="https://open.spotify.com/embed/show/3MjWJeGlQFAy2D2D2awo4t"
            width="100%"
            height="152"
            frameBorder="0"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
          />
        </section>

        {/* Section 7 — Novità */}
        <section>
          <p className="text-xs uppercase tracking-widest text-gray-400 mb-3">{t('news')}</p>
          <p className="text-sm text-gray-400">{t('newsPlaceholder')}</p>
        </section>

      </div>
    </div>
  );
}
