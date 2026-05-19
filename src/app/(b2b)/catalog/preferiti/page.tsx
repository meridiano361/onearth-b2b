'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Heart } from 'lucide-react';
import { useFavorites } from '@/hooks/useFavorites';
import ProductGrid from '@/components/catalog/ProductGrid';
import type { Product } from '@/types';

export default function PreferitiPage() {
  const t = useTranslations('favorites');
  const { favoriteIds, isLoading: favLoading } = useFavorites();

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
      <div className="px-4 sm:px-6 py-4 sm:py-6 border-b border-border/50">
        <p className="label-luxury text-accent">{t('subtitle')}</p>
        <h1 className="font-display text-xl sm:text-2xl text-primary font-light tracking-wide flex items-center gap-2">
          <Heart size={18} className="text-red-500 fill-red-500" />
          {t('title')}
        </h1>
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
          <ProductGrid products={favoritedProducts} isLoading={false} />
        )}
      </div>
    </div>
  );
}
