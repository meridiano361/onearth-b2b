'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { Globe, Mic, ShoppingBag, Check, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCartStore } from '@/store/cartStore';
import { useFavorites } from '@/hooks/useFavorites';
import { ProductImage } from '@/components/ui/ProductImage';
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
          <ProductImage src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFavorite(product.id); }}
            className={cn(
              'absolute top-1.5 left-1.5 bg-white/80 backdrop-blur-sm rounded-full p-1 transition-all duration-150',
              isFavorited(product.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            )}
          >
            <Heart size={10} className={isFavorited(product.id) ? 'fill-[#D4C4B0] text-[#D4C4B0]' : 'text-gray-400'} />
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
          <p
            className="text-xs text-primary mb-2"
            style={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              wordBreak: 'break-word',
              overflowWrap: 'break-word',
              minHeight: '2.5rem',
              maxHeight: '2.5rem',
              lineHeight: '1.25rem',
            }}
          >
            {product.name}
          </p>
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
      {/* Uniform vertical spacing: py-10 top/bottom + space-y-10 between sections = 40px everywhere */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 space-y-10">

        {/* ── Top CTA ─────────────────────────────────────────── */}
        <div className="flex justify-center">
          <Link
            href="/catalog/products"
            className="bg-black text-white rounded-xl px-8 py-3 text-sm font-semibold hover:bg-gray-800 transition-all duration-150"
          >
            Apri il catalogo e crea un ordine
          </Link>
        </div>

        {/* ── Scopri la collezione ─────────────────────────────── */}
        <section>
          <p className="font-display text-xl sm:text-2xl text-primary font-light tracking-wide mb-4 text-center mx-auto">
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
        </section>

        {/* ── Social links ───────────────────────────────────── */}
        <section>
          <div className="bg-white border border-gray-200 shadow-sm rounded-xl px-5 py-4">
            <div className="flex items-center justify-center gap-5 flex-wrap">
              {/* Instagram */}
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

              {/* Facebook */}
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

              {/* Pinterest */}
              <a
                href="https://it.pinterest.com/OnEarth_official/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Pinterest"
                className="hover:opacity-75 transition-opacity"
              >
                <svg viewBox="0 0 24 24" fill="#E60023" className="w-[22px] h-[22px]">
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 01.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/>
                </svg>
              </a>

              {/* TikTok */}
              <a
                href="https://www.tiktok.com/@onearth_official"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TikTok"
                className="hover:opacity-75 transition-opacity"
              >
                <svg viewBox="0 0 24 24" fill="#000000" className="w-[22px] h-[22px]">
                  <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.79 1.54V6.78a4.85 4.85 0 01-1.02-.09z"/>
                </svg>
              </a>

              {/* Website */}
              <a
                href="https://www.on-earth.it"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-black hover:text-gray-600 transition-colors whitespace-nowrap"
              >
                <Globe size={16} />
                on-earth.it
              </a>

              {/* Podcast */}
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
