'use client';

import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Search, SlidersHorizontal, X, Package } from 'lucide-react';
import { debounce } from '@/lib/utils';
import CatalogFilters from './CatalogFilters';
import ProductGrid from './ProductGrid';
import type { Product, Category } from '@/types';

export default function CatalogView() {
  const { data: session } = useSession();
  const isCustomer = session?.user?.role === 'CUSTOMER';

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // New filter states
  const [selectedFamiglia, setSelectedFamiglia] = useState<string | null>(null);
  const [selectedSottofamiglia, setSelectedSottofamiglia] = useState<string | null>(null);
  const [selectedColore, setSelectedColore] = useState<string | null>(null);
  const [selectedNomLinea, setSelectedNomLinea] = useState<string | null>(null);

  const debouncedSetSearch = useCallback(
    debounce((val: string) => setDebouncedSearch(val), 250),
    []
  );

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearch(e.target.value);
    debouncedSetSearch(e.target.value);
  }

  function handleResetAll() {
    setSelectedCategoryId(null);
    setSelectedFamiglia(null);
    setSelectedSottofamiglia(null);
    setSelectedColore(null);
    setSelectedNomLinea(null);
  }

  const hasActiveFilters = !!(
    selectedCategoryId ||
    selectedFamiglia ||
    selectedSottofamiglia ||
    selectedColore ||
    selectedNomLinea
  );

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

  function getDescendantIds(categoryId: string, cats: Category[]): string[] {
    const children = cats.filter((c) => c.parentId === categoryId);
    return [categoryId, ...children.flatMap((c) => getDescendantIds(c.id, cats))];
  }

  const filteredProducts = useMemo(() => {
    let result = products;

    if (selectedCategoryId) {
      const ids = getDescendantIds(selectedCategoryId, categories);
      result = result.filter((p) => p.categoryId && ids.includes(p.categoryId));
    }

    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter(
        (p) =>
          p.code.toLowerCase().includes(q) ||
          p.name.toLowerCase().includes(q) ||
          (p.description && p.description.toLowerCase().includes(q)) ||
          (p.notes && p.notes.toLowerCase().includes(q)) ||
          (p.famiglia && p.famiglia.toLowerCase().includes(q)) ||
          (p.sottofamiglia && p.sottofamiglia.toLowerCase().includes(q)) ||
          (p.nomLinea && p.nomLinea.toLowerCase().includes(q)) ||
          (p.produttore && p.produttore.toLowerCase().includes(q))
      );
    }

    if (selectedFamiglia) {
      result = result.filter((p) => p.famiglia === selectedFamiglia);
    }

    if (selectedSottofamiglia) {
      result = result.filter((p) => p.sottofamiglia === selectedSottofamiglia);
    }

    if (selectedColore) {
      result = result.filter((p) => p.colore === selectedColore);
    }

    if (selectedNomLinea) {
      result = result.filter((p) => p.nomLinea === selectedNomLinea);
    }

    return result;
  }, [products, selectedCategoryId, debouncedSearch, categories, selectedFamiglia, selectedSottofamiglia, selectedColore, selectedNomLinea]);

  const filterProps = {
    categories,
    products,
    selectedCategoryId,
    onCategoryChange: setSelectedCategoryId,
    selectedFamiglia,
    onFamigliaChange: setSelectedFamiglia,
    selectedSottofamiglia,
    onSottofamigliaChange: setSelectedSottofamiglia,
    selectedColore,
    onColoreChange: setSelectedColore,
    selectedNomLinea,
    onNomLineaChange: setSelectedNomLinea,
    hasActiveFilters,
    onResetAll: handleResetAll,
  };

  // Active filter count for the mobile button badge
  const activeFilterCount = [
    selectedCategoryId,
    selectedFamiglia,
    selectedSottofamiglia,
    selectedColore,
    selectedNomLinea,
  ].filter(Boolean).length;

  return (
    <div className="flex h-full">
      {/* Filters sidebar — desktop */}
      <div className="hidden md:block">
        <CatalogFilters {...filterProps} />
      </div>

      {/* Mobile filters drawer */}
      {showFilters && (
        <div className="md:hidden fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-primary/30"
            onClick={() => setShowFilters(false)}
          />
          <div className="absolute left-0 top-0 bottom-0 w-64 sm:w-72 bg-white shadow-luxury-xl overflow-y-auto">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="text-sm font-medium">Filtri</span>
              <button onClick={() => setShowFilters(false)} className="text-gray-400">
                <X size={16} />
              </button>
            </div>
            <CatalogFilters
              {...filterProps}
              onCategoryChange={(id) => { setSelectedCategoryId(id); setShowFilters(false); }}
              onFamigliaChange={(v) => { setSelectedFamiglia(v); setSelectedSottofamiglia(null); }}
            />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* ── Customer homepage section ─────────────────────── */}
        {isCustomer && (
          <div className="border-b border-border bg-cream/30 px-4 sm:px-6 py-5">
            {/* Welcome row + orders CTA */}
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="label-luxury text-accent text-2xs uppercase tracking-widest">Benvenuto</p>
                <h2 className="font-display text-xl text-primary font-light tracking-wide">CASA 2027</h2>
              </div>
              <Link
                href="/catalog/orders"
                className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white text-sm font-medium rounded hover:bg-primary/90 transition-colors flex-shrink-0"
              >
                <Package size={15} />
                I miei Ordini
              </Link>
            </div>

          </div>
        )}

        {/* Top bar */}
        <div className="sticky top-0 z-10 bg-background border-b border-border px-4 sm:px-6 py-3 flex items-center gap-2 sm:gap-3">
          {/* Mobile filter button */}
          <button
            onClick={() => setShowFilters(true)}
            className="md:hidden flex items-center gap-1.5 text-xs font-medium text-gray-600 border border-border rounded px-2.5 py-2 hover:bg-cream transition-colors flex-shrink-0 relative"
          >
            <SlidersHorizontal size={13} />
            Filtri
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-accent text-white text-2xs font-bold w-4 h-4 rounded-full flex items-center justify-center leading-none">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Search */}
          <div className="relative flex-1 md:max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={handleSearchChange}
              placeholder="Cerca per codice, nome, linea..."
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

          {/* Results count + reset */}
          <div className="hidden sm:flex items-center gap-3 flex-shrink-0">
            <span className="text-xs text-gray-400">
              {productsLoading ? 'Caricamento...' : `${filteredProducts.length} prodotti`}
            </span>
            {hasActiveFilters && (
              <button
                onClick={handleResetAll}
                className="text-xs text-accent hover:text-primary transition-colors font-medium"
              >
                Azzera filtri
              </button>
            )}
          </div>
        </div>

        {/* Active filter chips — desktop */}
        {hasActiveFilters && (
          <div className="hidden md:flex flex-wrap gap-1.5 px-6 py-2 border-b border-border/50 bg-cream/30">
            {selectedFamiglia && (
              <span className="inline-flex items-center gap-1 text-2xs bg-white border border-border rounded-full px-2.5 py-1 text-primary">
                {selectedFamiglia}
                <button onClick={() => setSelectedFamiglia(null)} className="text-gray-400 hover:text-primary ml-0.5"><X size={10} /></button>
              </span>
            )}
            {selectedSottofamiglia && (
              <span className="inline-flex items-center gap-1 text-2xs bg-white border border-border rounded-full px-2.5 py-1 text-primary">
                {selectedSottofamiglia}
                <button onClick={() => setSelectedSottofamiglia(null)} className="text-gray-400 hover:text-primary ml-0.5"><X size={10} /></button>
              </span>
            )}
            {selectedColore && (
              <span className="inline-flex items-center gap-1 text-2xs bg-white border border-border rounded-full px-2.5 py-1 text-primary">
                {selectedColore}
                <button onClick={() => setSelectedColore(null)} className="text-gray-400 hover:text-primary ml-0.5"><X size={10} /></button>
              </span>
            )}
            {selectedNomLinea && (
              <span className="inline-flex items-center gap-1 text-2xs bg-white border border-border rounded-full px-2.5 py-1 text-primary">
                {selectedNomLinea}
                <button onClick={() => setSelectedNomLinea(null)} className="text-gray-400 hover:text-primary ml-0.5"><X size={10} /></button>
              </span>
            )}
          </div>
        )}

        {/* Collection header */}
        <div className="px-4 sm:px-6 py-4 sm:py-6 border-b border-border/50">
          <p className="label-luxury text-accent">Collezione</p>
          <h1 className="font-display text-xl sm:text-2xl text-primary font-light tracking-wide">
            CASA 2027
          </h1>
        </div>

        {/* Product grid */}
        <div className="px-3 sm:px-6 py-4 sm:py-6">
          <ProductGrid products={filteredProducts} isLoading={productsLoading} />
        </div>
      </div>
    </div>
  );
}
