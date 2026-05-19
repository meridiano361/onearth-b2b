'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { FileDown } from 'lucide-react';
import ProductCard from './ProductCard';
import type { Product } from '@/types';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function CustomerHome() {
  const { data: session } = useSession();
  const companyName = session?.user?.companyName ?? '';
  const t = useTranslations('home');

  const { data: productsData, isLoading } = useQuery({
    queryKey: ['home-products'],
    queryFn: async () => {
      const res = await fetch('/api/products?active=true&limit=500', { cache: 'no-store' });
      if (!res.ok) return [] as Product[];
      return (await res.json()).data as Product[];
    },
    staleTime: 0,
    gcTime: 0,
  });

  const spotlightProducts = useMemo(() => {
    if (!productsData?.length) return [];
    return shuffle(productsData).slice(0, 10);
  }, [productsData]);

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
              href="/catalog/products"
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

        {/* Section 2 — Scopri la collezione (random products) */}
        <section>
          <p className="text-xs uppercase tracking-widest text-gray-400 mb-4">{t('spotlight')}</p>
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="aspect-square bg-white rounded animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {spotlightProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </section>

        {/* Section 3 — Condizioni Commerciali */}
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

        {/* Section 4 — Tempistiche di Ordine */}
        <section className="bg-white border border-border rounded-lg p-5">
          <p className="text-xs uppercase tracking-widest text-gray-400 mb-2">{t('timingTitle')}</p>
          <p className="text-sm text-gray-600">{t('timingText')}</p>
        </section>

        {/* Section 5 — Catalogo PDF */}
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

        {/* Section 6 — Scopri ON EARTH */}
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

        {/* Section 7 — Il nostro Podcast */}
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

        {/* Section 8 — Novità */}
        <section>
          <p className="text-xs uppercase tracking-widest text-gray-400 mb-3">{t('news')}</p>
          <p className="text-sm text-gray-400">{t('newsPlaceholder')}</p>
        </section>

        {/* Social icons */}
        <section className="flex items-center gap-4 pb-4">
          <a
            href="https://www.facebook.com/onearthofficial/"
            target="_blank"
            rel="noopener noreferrer"
            className="opacity-60 hover:opacity-100 transition-opacity"
            aria-label="Facebook"
          >
            <svg viewBox="0 0 24 24" fill="#1877F2" className="w-6 h-6">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
          </a>
          <a
            href="https://www.instagram.com/onearth_official/"
            target="_blank"
            rel="noopener noreferrer"
            className="opacity-60 hover:opacity-100 transition-opacity"
            aria-label="Instagram"
          >
            <svg viewBox="0 0 24 24" className="w-6 h-6">
              <defs>
                <linearGradient id="ig-grad-home" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" style={{stopColor:'#f09433'}} />
                  <stop offset="25%" style={{stopColor:'#e6683c'}} />
                  <stop offset="50%" style={{stopColor:'#dc2743'}} />
                  <stop offset="75%" style={{stopColor:'#cc2366'}} />
                  <stop offset="100%" style={{stopColor:'#bc1888'}} />
                </linearGradient>
              </defs>
              <path fill="url(#ig-grad-home)" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
            </svg>
          </a>
        </section>

      </div>
    </div>
  );
}
