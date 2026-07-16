'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Search, X, SlidersHorizontal } from 'lucide-react';
import Link from 'next/link';
import { ProductImage } from '@/components/ui/ProductImage';
import { useCartStore } from '@/store/cartStore';
import { formatCurrency, capitalize } from '@/lib/utils';
import {
  MODA_CATEGORY_GROUPS,
  MODA_SORT_OPTIONS,
  MODA_CARD_FIELDS,
  type ModaSortOption,
} from '@/lib/modaConfig';
import { MODA_COLLEZIONE } from '@/lib/modaAccess';
import type { Product } from '@/types';

function modaCost(p: Product): number {
  const con = Number(p.costoIeConReso);
  const senza = Number(p.costoIeSenzaReso);
  return con > 0 ? con : senza > 0 ? senza : Number(p.costPrice);
}

function ModaProductCard({ product }: { product: Product }) {
  const { setPendingProduct, getItemQuantity } = useCartStore();
  const inCart = getItemQuantity(product.id) > 0;

  return (
    <Link href={`/moda/product/${product.id}`} className="group block">
      <div className="relative aspect-[3/4] bg-[#111] rounded-xl overflow-hidden mb-2">
        <ProductImage
          src={product.imageUrl ?? product.imageUrl2 ?? product.imageUrl3 ?? product.imageUrl4 ?? product.imageUrl5}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {inCart && (
          <div className="absolute top-2 right-2 w-5 h-5 bg-white rounded-full flex items-center justify-center">
            <div className="w-2 h-2 bg-black rounded-full" />
          </div>
        )}
        <button
          onClick={(e) => { e.preventDefault(); setPendingProduct({ product, quantity: product.lotSize || 1 }); }}
          className="absolute bottom-0 left-0 right-0 py-2.5 bg-white/90 backdrop-blur-sm text-black text-xs font-medium text-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        >
          Aggiungi al carrello
        </button>
      </div>
      <div>
        {MODA_CARD_FIELDS.showCode && (
          <p className="text-xs text-white/40 font-mono">{product.code}</p>
        )}
        <p className="text-sm text-white leading-snug mt-0.5 line-clamp-2">{product.name}</p>
        {MODA_CARD_FIELDS.showColor && product.colore && (
          <p className="text-xs text-white/30 mt-0.5">{capitalize(product.colore)}</p>
        )}
        {MODA_CARD_FIELDS.showCostPrice && (
          <p className="text-xs text-white/60 mt-1">{formatCurrency(modaCost(product))}</p>
        )}
      </div>
    </Link>
  );
}

function sortProducts(products: Product[], sort: ModaSortOption): Product[] {
  return [...products].sort((a, b) => {
    if (sort === 'name_asc') return a.name.localeCompare(b.name);
    if (sort === 'name_desc') return b.name.localeCompare(a.name);
    if (sort === 'price_asc') return modaCost(a) - modaCost(b);
    if (sort === 'price_desc') return modaCost(b) - modaCost(a);
    return 0;
  });
}

export default function ModaCatalogo() {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sort, setSort] = useState<ModaSortOption>('name_asc');
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading } = useQuery<{ data: Product[] }>({
    queryKey: ['moda-products'],
    queryFn: () => fetch(`/api/products?active=true&collezione=${MODA_COLLEZIONE}&limit=500`).then((r) => r.json()),
    staleTime: 60_000,
  });

  const products = data?.data ?? [];

  const filtered = useMemo(() => {
    let list = products;
    if (selectedCategory) {
      list = list.filter((p) => {
        const haystack = [p.famiglia, p.sottofamiglia, p.classe, p.gruppoMerceologico]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(selectedCategory.toLowerCase());
      });
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.code.toLowerCase().includes(q) ||
          p.colore?.toLowerCase().includes(q)
      );
    }
    return sortProducts(list, sort);
  }, [products, search, selectedCategory, sort]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#0a0a0a]/95 backdrop-blur-sm px-4 py-4 border-b border-white/10">
        <div className="flex items-center gap-3 mb-3">
          <Link href="/moda" className="text-white/40 hover:text-white/70 transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div className="flex-1">
            <p className="text-xs text-white/40 uppercase tracking-widest">Moda PE27</p>
            <p className="text-sm font-medium">Catalogo</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/30">{filtered.length}</span>
            <button
              onClick={() => setShowFilters((v) => !v)}
              className={`p-1.5 rounded-lg transition-colors ${showFilters ? 'bg-white text-black' : 'text-white/40 hover:text-white/70'}`}
            >
              <SlidersHorizontal size={15} />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca prodotto, codice, colore…"
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-8 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-white/30"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filters panel */}
        {showFilters && (
          <div className="mt-3 space-y-3 pb-1">
            {/* Sort */}
            <div>
              <p className="text-2xs text-white/30 uppercase tracking-widest mb-1.5">Ordina</p>
              <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                {MODA_SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setSort(opt.value)}
                    className={`flex-shrink-0 px-3 py-1 rounded-full text-xs transition-colors ${
                      sort === opt.value ? 'bg-white text-black' : 'bg-white/10 text-white/60 hover:bg-white/15'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Category groups */}
            {MODA_CATEGORY_GROUPS.map((group) => (
              <div key={group.id}>
                <p className="text-2xs text-white/30 uppercase tracking-widest mb-1.5">{group.label}</p>
                <div className="flex gap-2 flex-wrap">
                  {group.categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id === selectedCategory ? '' : cat.id)}
                      className={`flex-shrink-0 px-3 py-1 rounded-full text-xs transition-colors ${
                        selectedCategory === cat.id ? 'bg-white text-black' : 'bg-white/10 text-white/60 hover:bg-white/15'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {(search || selectedCategory) && (
              <button
                onClick={() => { setSearch(''); setSelectedCategory(''); }}
                className="text-xs text-white/30 hover:text-white/60 transition-colors"
              >
                × Rimuovi filtri
              </button>
            )}
          </div>
        )}
      </div>

      {/* Grid */}
      <div className="px-4 py-6">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="aspect-[3/4] bg-white/5 rounded-xl animate-pulse" />
                <div className="h-3 bg-white/5 rounded animate-pulse w-1/2" />
                <div className="h-4 bg-white/5 rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-white/30">
            <SlidersHorizontal size={32} className="mb-3" />
            <p className="text-sm">Nessun prodotto trovato</p>
            {(search || selectedCategory) && (
              <button
                onClick={() => { setSearch(''); setSelectedCategory(''); }}
                className="mt-2 text-xs underline underline-offset-2 hover:text-white/50"
              >
                Rimuovi filtri
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {filtered.map((p) => (
              <ModaProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
