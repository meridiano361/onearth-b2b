'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { Globe, Mic, ShoppingBag, Check, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCartStore } from '@/store/cartStore';
import { useFavorites } from '@/hooks/useFavorites';
import type { Product } from '@/types';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function SpotlightCard({ product }: { product: Product }) {
  const { addItem, getItemQuantity } = useCartStore();
  const { isFavorited, toggle: toggleFavorite } = useFavorites();
  const [justAdded, setJustAdded] = useState(false);
  const [imgError, setImgError] = useState(false);

  const cartQty = getItemQuantity(product.id);
  const inCart = cartQty > 0;

  function handleAdd(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    addItem(product, product.lotSize || 1);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1500);
  }

  return (
    <div className="flex-none w-36 flex flex-col bg-white rounded-lg border border-border overflow-hidden">
      <Link href={`/catalog/${product.id}`} className="block relative group">
        <div className="h-36 w-36 relative bg-cream overflow-hidden">
          {product.imageUrl && !imgError ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <span className="font-display text-xl text-gray-300">{product.code.slice(0, 2)}</span>
            </div>
          )}
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFavorite(product.id); }}
            className={cn(
              'absolute top-1.5 left-1.5 bg-white/80 backdrop-blur-sm rounded-full p-1 transition-all duration-150',
              isFavorited(product.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            )}
          >
            <Heart size={10} className={isFavorited(product.id) ? 'fill-red-500 text-red-500' : 'text-gray-400'} />
          </button>
          {inCart && (
            <div className="absolute top-1.5 right-1.5 bg-accent rounded-full p-0.5">
              <Check size={8} className="text-white" />
            </div>
          )}
        </div>
      </Link>

      <div className="p-2 flex flex-col flex-1">
        <Link href={`/catalog/${product.id}`}>
          <p className="text-xs text-primary leading-snug line-clamp-2 break-words min-h-[2.5rem] mb-2">{product.name}</p>
        </Link>
        <button
          onClick={handleAdd}
          className={cn(
            'w-full py-1.5 text-2xs font-medium rounded transition-all duration-150 flex items-center justify-center gap-1',
            justAdded
              ? 'bg-accent/20 text-accent'
              : 'bg-primary text-white hover:bg-warm-darker active:scale-95'
          )}
        >
          {justAdded ? <><Check size={10} /> Aggiunto</> : <><ShoppingBag size={10} /> Aggiungi</>}
        </button>
      </div>
    </div>
  );
}

export default function CustomerHome() {
  const th = useTranslations('home');

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
    return shuffle(productsData).slice(0, 6);
  }, [productsData]);

  return (
    <div className="min-h-screen bg-cream">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-4 pb-6 space-y-10">

        {/* ── Top CTA ─────────────────────────────────────────── */}
        <div className="flex justify-center">
          <Link
            href="/catalog/products"
            className="px-8 py-2.5 text-sm font-semibold bg-black text-white rounded-lg hover:bg-warm-darker transition-all duration-150"
          >
            Apri il catalogo
          </Link>
        </div>

        {/* ── Scopri la collezione ─────────────────────────────── */}
        <section>
          <p className="font-display text-xl sm:text-2xl text-primary font-light tracking-wide mb-4">
            {th('collectionTitle')}
          </p>

          {isLoading ? (
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex-none w-36 h-52 bg-white rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-1">
              {spotlightProducts.map((product) => (
                <div key={product.id} className="snap-start">
                  <SpotlightCard product={product} />
                </div>
              ))}
            </div>
          )}

          {/* CTA dopo lo scroll */}
          <div className="flex justify-center mt-5">
            <Link
              href="/catalog/products"
              className="px-8 py-2.5 text-sm font-semibold bg-primary text-white rounded-lg hover:bg-warm-darker transition-all duration-150"
            >
              Crea un ordine
            </Link>
          </div>
        </section>

        {/* ── Esplora l'ecosistema ON EARTH ───────────────────── */}
        <section className="!mb-0">
          <p className="font-display text-xl sm:text-2xl text-primary font-light tracking-wide mb-4 whitespace-nowrap">
            {th('discoverTitle')}
          </p>

          <div className="bg-white border border-gray-200 shadow-sm rounded-xl px-5 pt-5 pb-4">
            {/* Row 1: IG + FB a sinistra | on-earth.it a destra */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <a
                  href="https://www.instagram.com/onearth_official/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-black hover:text-gray-600 transition-colors"
                  aria-label="Instagram"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-[22px] h-[22px]">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                  </svg>
                </a>
                <a
                  href="https://www.facebook.com/onearthofficial/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-black hover:text-gray-600 transition-colors"
                  aria-label="Facebook"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-[22px] h-[22px]">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </a>
              </div>
              <a
                href="https://www.on-earth.it"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-black hover:text-gray-600 transition-colors whitespace-nowrap"
              >
                <Globe size={16} />
                on-earth.it
              </a>
            </div>

            {/* Row 2: Podcast centrato */}
            <div className="flex justify-center">
              <a
                href="https://open.spotify.com/show/3MjWJeGlQFAy2D2D2awo4t"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 text-sm text-black bg-white border-2 border-black rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Mic size={16} />
                Podcast MATERIA
              </a>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
