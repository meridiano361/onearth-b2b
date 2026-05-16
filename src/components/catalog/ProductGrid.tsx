'use client';

import ProductCard from './ProductCard';
import type { Product } from '@/types';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Package } from 'lucide-react';

interface ProductGridProps {
  products: Product[];
  isLoading?: boolean;
}

export default function ProductGrid({ products, isLoading }: ProductGridProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <LoadingSpinner size="lg" text="Caricamento collezione..." />
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 rounded-full bg-cream flex items-center justify-center mb-4">
          <Package size={24} className="text-gray-300" />
        </div>
        <h3 className="font-display text-lg text-primary font-light">Nessun prodotto trovato</h3>
        <p className="mt-1 text-sm text-gray-400">Prova a modificare i filtri</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
