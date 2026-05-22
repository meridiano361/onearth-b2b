'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Heart } from 'lucide-react';
import { useFavorites } from '@/hooks/useFavorites';
import { useViewMode } from '@/hooks/useViewMode';
import ProductGrid from '@/components/catalog/ProductGrid';
import ProductList from '@/components/catalog/ProductList';
import ProductLookbook from '@/components/catalog/ProductLookbook';
import { ViewToggle } from '@/components/catalog/ViewToggle';
import type { Product } from '@/types';

export default function PreferitiPage() {
  const t = useTranslations('favorites');
  const { favoriteIds, isLoading: favLoading } = useFavorites();
  const { mode: viewMode, changeMode: setViewMode } = useViewMode();

  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await fetch('/api/products?active=true&limit=500');
      if (!res.ok) throw new Error('Failed to fetch products');
      return (await res.json()).data as Product[];
    },
  });

  const favoritedProducts = useMemo(() => {
    if (!productsData) return [];
    return productsData.filter((p) => favoriteIds.has(p.id));
  }, [productsData, favoriteIds]);

  const isLoading = favLoading || productsLoading;

  return (
    <div className="flex flex-col min-h-full">
      <div className="px-4 sm:px-6 py-4 sm:py-6 border-b border-border/50 flex items-center justify-between gap-4">
        <div>
          <p className="label-luxury text-accent">{t('subtitle')}</p>
          <h1 className="font-display text-xl sm:text-2xl text-primary font-light tracking-wide">
            I miei preferiti
          </h1>
        </div>
        {favoritedProducts.length > 0 && (
          <ViewToggle mode={viewMode} onChange={setViewMode} />
        )}
      </div>

      <div className="px-3 sm:px-6 py-4 sm:py-6">
        {isLoading ? (
          <p className="text-sm text-gray-400 py-10 text-center">{t('loading')}</p>
        ) : favoritedProducts.length === 0 ? (
          <div className="py-16 text-center">
            <Heart size={36} className="mx-auto text-gray-200 mb-4" />
            <p className="text-sm font-medium text-gray-500 mb-1">{t('noFavorites')}</p>
            <p className="text-xs text-gray-400">{t('noFavoritesHint')}</p>
          </div>
        ) : (
          <>
            {viewMode === 'grid' && <ProductGrid products={favoritedProducts} isLoading={false} />}
            {viewMode === 'list' && <ProductList products={favoritedProducts} isLoading={false} />}
            {viewMode === 'lookbook' && <ProductLookbook products={favoritedProducts} isLoading={false} />}
          </>
        )}
      </div>
    </div>
  );
}
