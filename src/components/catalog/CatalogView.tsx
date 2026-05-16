'use client';

import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { debounce } from '@/lib/utils';
import CatalogFilters from './CatalogFilters';
import ProductGrid from './ProductGrid';
import type { Product, Category } from '@/types';

export default function CatalogView() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 99999]);
  const [showFilters, setShowFilters] = useState(false);

  const debouncedSetSearch = useCallback(
    debounce((val: string) => setDebouncedSearch(val), 250),
    []
  );

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearch(e.target.value);
    debouncedSetSearch(e.target.value);
  }

  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await fetch('/api/products?active=true&limit=500');
      if (!res.ok) throw new Error('Failed to fetch products');
      const json = await res.json();
      return json.data as Product[];
    },
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await fetch('/api/categories');
      if (!res.ok) throw new Error('Failed to fetch categories');
      const json = await res.json();
      return json.data as Category[];
    },
  });

  const products = productsData || [];
  const categories = categoriesData || [];

  // Get all descendant IDs of a category
  function getDescendantIds(categoryId: string, cats: Category[]): string[] {
    const children = cats.filter((c) => c.parentId === categoryId);
    return [categoryId, ...children.flatMap((c) => getDescendantIds(c.id, cats))];
  }

  const maxPrice = useMemo(() => {
    if (products.length === 0) return 10000;
    return Math.ceil(Math.max(...products.map((p) => p.costPrice)) / 100) * 100;
  }, [products]);

  // Initialize price range when maxPrice is computed
  useMemo(() => {
    if (priceRange[1] === 99999 && maxPrice < 99999) {
      setPriceRange([0, maxPrice]);
    }
  }, [maxPrice]);

  const filteredProducts = useMemo(() => {
    let result = products;

    // Category filter (include children)
    if (selectedCategoryId) {
      const ids = getDescendantIds(selectedCategoryId, categories);
      result = result.filter((p) => p.categoryId && ids.includes(p.categoryId));
    }

    // Search
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter(
        (p) =>
          p.code.toLowerCase().includes(q) ||
          p.name.toLowerCase().includes(q) ||
          (p.description && p.description.toLowerCase().includes(q)) ||
          (p.notes && p.notes.toLowerCase().includes(q))
      );
    }

    // Price range
    result = result.filter((p) => p.costPrice <= priceRange[1] && p.costPrice >= priceRange[0]);

    return result;
  }, [products, selectedCategoryId, debouncedSearch, priceRange, categories]);

  return (
    <div className="flex h-full">
      {/* Filters sidebar — desktop */}
      <div className="hidden md:block">
        <CatalogFilters
          categories={categories}
          selectedCategoryId={selectedCategoryId}
          onCategoryChange={setSelectedCategoryId}
          priceRange={priceRange}
          onPriceRangeChange={setPriceRange}
          maxPrice={maxPrice}
        />
      </div>

      {/* Mobile filters drawer */}
      {showFilters && (
        <div className="md:hidden fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-primary/30"
            onClick={() => setShowFilters(false)}
          />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-white shadow-luxury-xl overflow-y-auto">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="text-sm font-medium">Filtri</span>
              <button onClick={() => setShowFilters(false)} className="text-gray-400">
                <X size={16} />
              </button>
            </div>
            <CatalogFilters
              categories={categories}
              selectedCategoryId={selectedCategoryId}
              onCategoryChange={(id) => { setSelectedCategoryId(id); setShowFilters(false); }}
              priceRange={priceRange}
              onPriceRangeChange={setPriceRange}
              maxPrice={maxPrice}
            />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="sticky top-0 z-10 bg-background border-b border-border px-6 py-3 flex items-center gap-3">
          {/* Mobile filter button */}
          <button
            onClick={() => setShowFilters(true)}
            className="md:hidden flex items-center gap-1.5 text-xs font-medium text-gray-600 border border-border rounded px-2.5 py-1.5 hover:bg-cream transition-colors"
          >
            <SlidersHorizontal size={13} />
            Filtri
          </button>

          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={handleSearchChange}
              placeholder="Cerca per codice o nome..."
              className="w-full pl-9 pr-8 py-2 text-sm bg-white border border-border rounded focus:outline-none focus:border-accent transition-colors"
            />
            {search && (
              <button
                onClick={() => { setSearch(''); setDebouncedSearch(''); }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Results count */}
          <div className="flex-1 hidden sm:flex items-center justify-end">
            <span className="text-xs text-gray-400">
              {productsLoading ? 'Caricamento...' : `${filteredProducts.length} prodotti`}
            </span>
          </div>
        </div>

        {/* Collection header */}
        <div className="px-6 py-6 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div>
              <p className="label-luxury text-accent">Collezione</p>
              <h1 className="font-display text-2xl text-primary font-light tracking-wide">
                CASA 2027
              </h1>
            </div>
          </div>
        </div>

        {/* Product grid */}
        <div className="px-6 py-6">
          <ProductGrid products={filteredProducts} isLoading={productsLoading} />
        </div>
      </div>
    </div>
  );
}
