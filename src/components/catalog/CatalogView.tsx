'use client';

import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Search, SlidersHorizontal, X, Package, Heart, FileDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn, debounce } from '@/lib/utils';
import { useFavorites } from '@/hooks/useFavorites';
import CatalogFilters from './CatalogFilters';
import ProductGrid from './ProductGrid';
import type { Product } from '@/types';

type Filters = {
  gruppoMerceologico: string | null;
  famiglia:           string | null;
  classe:             string | null;
  sottoclasse:        string | null;
  gruppoOmogeneo:     string | null;
  nomLinea:           string | null;
  colore:             string | null;
  collezione:         string | null;
  produttore:         string | null;
  tranche:            string | null;
};

const EMPTY_FILTERS: Filters = {
  gruppoMerceologico: null,
  famiglia:           null,
  classe:             null,
  sottoclasse:        null,
  gruppoOmogeneo:     null,
  nomLinea:           null,
  colore:             null,
  collezione:         null,
  produttore:         null,
  tranche:            null,
};

export default function CatalogView() {
  const { data: session } = useSession();
  const isCustomer = session?.user?.role === 'CUSTOMER';

  const [search, setSearch]               = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showFilters, setShowFilters]     = useState(false);
  const [filters, setFilters]             = useState<Filters>(EMPTY_FILTERS);
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [sortBy, setSortBy]               = useState<'default' | 'az' | 'za' | 'price-asc' | 'price-desc'>('default');
  const { favoriteIds } = useFavorites();
  const tn = useTranslations('nav');

  const debouncedSetSearch = useCallback(
    debounce((val: string) => setDebouncedSearch(val), 250),
    []
  );

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearch(e.target.value);
    debouncedSetSearch(e.target.value);
  }

  function setFilter(key: keyof Filters, value: string | null) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function handleResetAll() {
    setFilters(EMPTY_FILTERS);
  }

  const hasActiveFilters = Object.values(filters).some(Boolean);

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await fetch('/api/products?active=true&limit=500');
      if (!res.ok) throw new Error('Failed to fetch products');
      return (await res.json()).data as Product[];
    },
  });

  const { data: docsData } = useQuery({
    queryKey: ['public-documents'],
    queryFn: () => fetch('/api/documents').then((r) => r.json()),
    staleTime: 60_000,
  });
  const publicDocs: { tipo: string; url: string; nome: string }[] = docsData?.data ?? [];
  const condizioniDoc = publicDocs.find((d) => d.tipo === 'Condizioni Commerciali');
  const catalogoDoc   = publicDocs.find((d) => d.tipo === 'Catalogo PDF');

  const products = productsData ?? [];

  const filteredProducts = useMemo(() => {
    let result = products;

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

    const { gruppoMerceologico, famiglia, classe, sottoclasse, gruppoOmogeneo, nomLinea, colore, collezione, produttore, tranche } = filters;
    if (gruppoMerceologico) result = result.filter((p) => p.gruppoMerceologico === gruppoMerceologico);
    if (famiglia)           result = result.filter((p) => p.famiglia           === famiglia);
    if (classe)             result = result.filter((p) => p.classe             === classe);
    if (sottoclasse)        result = result.filter((p) => p.sottoclasse        === sottoclasse);
    if (gruppoOmogeneo)     result = result.filter((p) => p.gruppoOmogeneo     === gruppoOmogeneo);
    if (nomLinea)           result = result.filter((p) => p.nomLinea           === nomLinea);
    if (colore)             result = result.filter((p) => p.colore             === colore);
    if (collezione)         result = result.filter((p) => p.collezione         === collezione);
    if (produttore)         result = result.filter((p) => p.produttore         === produttore);
    if (tranche)            result = result.filter((p) => p.tranche            === tranche);
    if (onlyFavorites)      result = result.filter((p) => favoriteIds.has(p.id));

    if (sortBy === 'az')         result = [...result].sort((a, b) => a.name.localeCompare(b.name, 'it'));
    else if (sortBy === 'za')    result = [...result].sort((a, b) => b.name.localeCompare(a.name, 'it'));
    else if (sortBy === 'price-asc')  result = [...result].sort((a, b) => Number(a.costPrice) - Number(b.costPrice));
    else if (sortBy === 'price-desc') result = [...result].sort((a, b) => Number(b.costPrice) - Number(a.costPrice));

    return result;
  }, [products, debouncedSearch, filters, onlyFavorites, favoriteIds, sortBy]);

  const filterProps = {
    products,
    selectedGruppoMerceologico: filters.gruppoMerceologico, onGruppoMerceologicoChange: (v: string | null) => setFilter('gruppoMerceologico', v),
    selectedFamiglia:           filters.famiglia,           onFamigliaChange:           (v: string | null) => setFilter('famiglia', v),
    selectedClasse:             filters.classe,             onClasseChange:             (v: string | null) => setFilter('classe', v),
    selectedSottoclasse:        filters.sottoclasse,        onSottoclasseChange:        (v: string | null) => setFilter('sottoclasse', v),
    selectedGruppoOmogeneo:     filters.gruppoOmogeneo,     onGruppoOmogeneoChange:     (v: string | null) => setFilter('gruppoOmogeneo', v),
    selectedNomLinea:           filters.nomLinea,           onNomLineaChange:           (v: string | null) => setFilter('nomLinea', v),
    selectedColore:             filters.colore,             onColoreChange:             (v: string | null) => setFilter('colore', v),
    selectedCollezione:         filters.collezione,         onCollezioneChange:         (v: string | null) => setFilter('collezione', v),
    selectedProduttore:         filters.produttore,         onProduttoreChange:         (v: string | null) => setFilter('produttore', v),
    selectedTranche:            filters.tranche,            onTrancheChange:            (v: string | null) => setFilter('tranche', v),
    hasActiveFilters,
    onResetAll: handleResetAll,
  };

  const CHIP_LABELS: { key: keyof Filters; label: string }[] = [
    { key: 'gruppoMerceologico', label: 'Gruppo merceologico' },
    { key: 'famiglia',           label: 'Famiglia' },
    { key: 'classe',             label: 'Classe' },
    { key: 'sottoclasse',        label: 'Sottoclasse' },
    { key: 'gruppoOmogeneo',     label: 'Gruppo omogeneo' },
    { key: 'nomLinea',           label: 'Linea' },
    { key: 'colore',             label: 'Colore' },
    { key: 'collezione',         label: 'Collezione' },
    { key: 'produttore',         label: 'Produttore' },
    { key: 'tranche',            label: 'Tranche' },
  ];

  return (
    <div className="flex h-full">
      {/* Filters sidebar — desktop */}
      <div className="hidden md:block">
        <CatalogFilters {...filterProps} />
      </div>

      {/* Mobile filters drawer */}
      {showFilters && (
        <div className="md:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-primary/30" onClick={() => setShowFilters(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-64 sm:w-72 bg-white shadow-luxury-xl overflow-y-auto">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="text-sm font-medium">Filtri</span>
              <button onClick={() => setShowFilters(false)} className="text-gray-400">
                <X size={16} />
              </button>
            </div>
            <CatalogFilters {...filterProps} />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* ── Catalog PDF download ─────────────────────────── */}
        <div className="border-b border-border bg-cream/30 px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3">
          <span className="text-2xs uppercase tracking-widest text-gray-400 font-medium hidden sm:block">CASA 2027</span>
          <div className="flex items-center gap-4 ml-auto">
            {condizioniDoc && (
              <a
                href={condizioniDoc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-primary transition-colors"
              >
                <FileDown size={13} />
                Condizioni Commerciali
              </a>
            )}
            {catalogoDoc && (
              <a
                href={catalogoDoc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-primary transition-colors"
              >
                <FileDown size={13} />
                Catalogo CASA 2027
              </a>
            )}
          </div>
        </div>

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

          {/* Sort selector */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="text-xs border border-border rounded px-2 py-2 bg-white text-gray-600 focus:outline-none focus:border-accent transition-colors flex-shrink-0"
          >
            <option value="" disabled>Ordina per...</option>
            <option value="default">Rilevanza</option>
            <option value="az">A → Z</option>
            <option value="za">Z → A</option>
            <option value="price-asc">Prezzo crescente</option>
            <option value="price-desc">Prezzo decrescente</option>
          </select>

          {/* Favorites toggle */}
          <button
            onClick={() => setOnlyFavorites((v) => !v)}
            className={cn(
              'flex items-center gap-1.5 text-xs font-medium border rounded px-2.5 py-2 transition-colors flex-shrink-0',
              onlyFavorites
                ? 'bg-red-50 border-red-300 text-red-600'
                : 'text-gray-600 border-border hover:bg-cream'
            )}
          >
            <Heart size={13} className={onlyFavorites ? 'fill-red-500 text-red-500' : ''} />
            <span className="hidden sm:inline">{tn('favorites')}</span>
          </button>

          {/* Results count + reset */}
          <div className="hidden sm:flex items-center gap-3 flex-shrink-0">
            <span className="text-xs text-gray-400">
              {productsLoading ? 'Caricamento...' : `${filteredProducts.length} prodotti`}
            </span>
            {hasActiveFilters && (
              <button onClick={handleResetAll} className="text-xs text-accent hover:text-primary transition-colors font-medium">
                Azzera filtri
              </button>
            )}
          </div>
        </div>

        {/* Active filter chips — desktop */}
        {hasActiveFilters && (
          <div className="hidden md:flex flex-wrap gap-1.5 px-6 py-2 border-b border-border/50 bg-cream/30">
            {CHIP_LABELS.map(({ key, label }) =>
              filters[key] ? (
                <span key={key} className="inline-flex items-center gap-1 text-2xs bg-white border border-border rounded-full px-2.5 py-1 text-primary">
                  <span className="text-gray-400">{label}:</span> {filters[key]}
                  <button onClick={() => setFilter(key, null)} className="text-gray-400 hover:text-primary ml-0.5">
                    <X size={10} />
                  </button>
                </span>
              ) : null
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
