'use client';

import { useState, useMemo, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, FileText, Minus, Plus, X, Search, Loader2, MapPin, Copy, Layers, Pencil, Check, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import OrderExcelExport from '@/components/orders/OrderExcelExport';
import OrderDemetraExport from '@/components/orders/OrderDemetraExport';
import { ProductImage } from '@/components/ui/ProductImage';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import { formatCurrency } from '@/lib/utils';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import DisplayGroupsManager from '@/components/catalog/DisplayGroupsManager';
import CalendarioEsposizione from '@/components/catalog/CalendarioEsposizione';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import type { Order, OrderItem, Product, Destinazione } from '@/types';

// ── Sort options ───────────────────────────────────────────────
const PREVIEW_SORT_KEY = 'preview-sort';
const SORT_OPTIONS = [
  { value: 'name-asc',   label: 'Nome A→Z' },
  { value: 'name-desc',  label: 'Nome Z→A' },
  { value: 'linea-asc',  label: 'Linea A→Z' },
  { value: 'linea-desc', label: 'Linea Z→A' },
  { value: 'price-asc',  label: 'Prezzo ↑' },
  { value: 'price-desc', label: 'Prezzo ↓' },
  { value: 'novita',     label: 'Novità' },
  { value: 'continuativi', label: 'Continuativi' },
] as const;

function sortGroupItems<T extends { product?: any }>(grpItems: T[], sortBy: string): T[] {
  return [...grpItems].sort((a, b) => {
    const pa = a.product;
    const pb = b.product;
    if (!pa || !pb) return 0;
    switch (sortBy) {
      case 'name-asc':  return pa.name.localeCompare(pb.name, 'it');
      case 'name-desc': return pb.name.localeCompare(pa.name, 'it');
      case 'linea-asc':  return (pa.nomLinea ?? '').localeCompare(pb.nomLinea ?? '', 'it');
      case 'linea-desc': return (pb.nomLinea ?? '').localeCompare(pa.nomLinea ?? '', 'it');
      case 'price-asc':  return Number(pa.retailPrice) - Number(pb.retailPrice);
      case 'price-desc': return Number(pb.retailPrice) - Number(pa.retailPrice);
      case 'novita': {
        const aNew = pa.collezione === 'CA27' ? 0 : 1;
        const bNew = pb.collezione === 'CA27' ? 0 : 1;
        return aNew !== bNew ? aNew - bNew : pa.name.localeCompare(pb.name, 'it');
      }
      case 'continuativi': {
        const aCont = !pa.collezione || pa.collezione !== 'CA27' ? 0 : 1;
        const bCont = !pb.collezione || pb.collezione !== 'CA27' ? 0 : 1;
        return aCont !== bCont ? aCont - bCont : pa.name.localeCompare(pb.name, 'it');
      }
      default: return 0;
    }
  });
}

// ── Grouping options ───────────────────────────────────────────
// Ordine: gruppo merceologico → famiglia → classe → sottoclasse → gruppo omogeneo
//         → linea → tema colore → stagione → collezione → produttore → tranche
const GROUPING_KEYS = [
  'gruppoMerceologico',
  'famiglia',
  'classe',
  'sottoclasse',
  'gruppoOmogeneo',
  'nomLinea',
  'temaColore',
  'stagione',
  'collezione',
  'produttore',
  'tranche',
] as const;

type QtyMap = Record<string, number>;

// ── Product card ───────────────────────────────────────────────
function ProductCard({
  item,
  effectiveQty,
  effectiveSubtotal,
  onQtyChange,
  onRemove,
  removeLabel,
  decreaseLabel,
  increaseLabel,
}: {
  item: OrderItem;
  effectiveQty: number;
  effectiveSubtotal: number;
  onQtyChange: (id: string, qty: number) => void;
  onRemove: (id: string) => void;
  removeLabel: string;
  decreaseLabel: string;
  increaseLabel: string;
}) {
  const product = item.product!;
  const lotSize = product.lotSize || 1;

  return (
    <div className="bg-white border border-border flex flex-col">
      {/* Image */}
      <div className="relative aspect-[4/3] bg-[#C8C0B5] overflow-hidden">
        <ProductImage src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
        {/* Remove button */}
        <button
          onClick={() => onRemove(item.id)}
          className="absolute top-2 left-2 bg-white/80 rounded p-1 text-gray-500 hover:text-red-500 transition-colors"
          title={removeLabel}
        >
          <X size={12} />
        </button>
        {/* Qty badge */}
        <div className="absolute top-2 right-2 bg-primary/90 text-white text-2xs font-bold px-1.5 py-0.5 leading-tight">
          ×{effectiveQty}
        </div>
      </div>

      {/* Body */}
      <div className="p-2.5 flex flex-col gap-1.5 grow">
        <div>
          <div className="flex items-center gap-1.5 leading-none">
            <p className="text-2xs font-mono text-gray-400 tracking-wider">{product.code}</p>
            {product.collezione === 'CA27' && (
              <span className="bg-black text-white text-[8px] font-bold px-1 py-px rounded-sm leading-none flex-shrink-0">NUOVO</span>
            )}
          </div>
          <p className="text-xs font-medium text-primary leading-snug mt-1 h-10 overflow-hidden">{product.name}</p>
        </div>

        <p className="text-2xs text-gray-400 mt-auto">
          PVP:{' '}
          <span className="text-gray-600 font-medium">{formatCurrency(product.retailPrice)}</span>
        </p>

        {/* Quantity control — no disabled, UI is optimistic */}
        <div className="flex items-center justify-between pt-2 border-t border-border/60">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const newQty = effectiveQty - lotSize;
                if (newQty <= 0) {
                  if (window.confirm('Vuoi rimuovere il prodotto dall\'ordine?')) {
                    onRemove(item.id);
                  }
                } else {
                  onQtyChange(item.id, newQty);
                }
              }}
              className="w-10 h-10 flex items-center justify-center rounded border border-border hover:bg-cream transition-colors active:scale-95"
              aria-label={decreaseLabel}
            >
              <Minus size={14} />
            </button>
            <span className="text-xl font-semibold text-primary text-center min-w-[2.5rem]">{effectiveQty}</span>
            <button
              onClick={() => onQtyChange(item.id, effectiveQty + lotSize)}
              className="w-10 h-10 flex items-center justify-center rounded border border-border hover:bg-cream transition-colors active:scale-95"
              aria-label={increaseLabel}
            >
              <Plus size={14} />
            </button>
          </div>
          <span className="text-sm font-semibold text-primary">{formatCurrency(effectiveSubtotal)}</span>
        </div>
      </div>
    </div>
  );
}

// ── Add Products Modal ─────────────────────────────────────────
function AddProductsModal({
  orderId,
  onClose,
  onAdded,
  addProductsLabel,
  searchPlaceholder,
  loadingLabel,
  noProductsLabel,
  addLabel,
  orderProductIds,
  orderItems,
}: {
  orderId: string;
  onClose: () => void;
  onAdded: () => void;
  addProductsLabel: string;
  searchPlaceholder: string;
  loadingLabel: string;
  noProductsLabel: string;
  addLabel: string;
  orderProductIds: Set<string>;
  orderItems: OrderItem[];
}) {
  const [tab, setTab] = useState<'ricerca' | 'catalogo'>('ricerca');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [addingId, setAddingId] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [presenzaFilter, setPresenzaFilter] = useState<'tutti' | 'non-ancora' | 'gia'>('tutti');
  const [previewProduct, setPreviewProduct] = useState<Product | null>(null);
  const [galleryIndex, setGalleryIndex] = useState(0);

  // Dedicated query for "già nell'ordine" — fetches exact product IDs, no active filter
  const giaIdsParam = useMemo(
    () => Array.from(orderProductIds).join(','),
    [orderProductIds]
  );
  const { data: giaProductsRaw } = useQuery<Product[]>({
    queryKey: ['products-gia', giaIdsParam],
    queryFn: async () => {
      if (!giaIdsParam) return [];
      const res = await fetch(`/api/products?ids=${giaIdsParam}`);
      if (!res.ok) throw new Error();
      return (await res.json()).data as Product[];
    },
    enabled: presenzaFilter === 'gia' && orderProductIds.size > 0,
    staleTime: 30_000,
  });

  const giaProducts = useMemo<Product[]>(() => {
    const base = giaProductsRaw ?? [];
    if (!debouncedSearch.trim()) return base;
    const q = debouncedSearch.toLowerCase();
    return base.filter(p =>
      p.code.toLowerCase().includes(q) ||
      p.name.toLowerCase().includes(q)
    );
  }, [giaProductsRaw, debouncedSearch]);

  function applyPresenzaFilter(list: Product[]): Product[] {
    if (presenzaFilter === 'non-ancora') return list.filter(p => !orderProductIds.has(p.id));
    return list;
  }

  // ── Catalog tab state ──────────────────────────────────────
  const [filters, setFilters] = useState<Record<string, string>>({});

  type FilterOptions = Record<string, string[]>;
  const { data: filterOptions } = useQuery<FilterOptions>({
    queryKey: ['products-filter-options'],
    queryFn: async () => {
      const res = await fetch('/api/products/filters');
      if (!res.ok) throw new Error(`products/filters ${res.status}`);
      const d = await res.json();
      return (d.data ?? {}) as FilterOptions;
    },
    staleTime: 5 * 60_000,
    enabled: tab === 'catalogo',
  });
  const fo = filterOptions ?? {};

  const catalogParams = useMemo(() => {
    const p = new URLSearchParams({ active: 'true', limit: '9999' });
    const keys = [
      'stagione','colore','temaColore','collezione','tranche',
      'nomLinea','famiglia','sottofamiglia','gruppoOmogeneo',
      'classe','sottoclasse','gruppoMerceologico','produttore',
    ];
    keys.forEach(k => { if (filters[k]) p.set(k, filters[k]); });
    return p.toString();
  }, [filters]);

  const { data: catalogProducts, isLoading: catalogLoading } = useQuery<Product[]>({
    queryKey: ['products-catalog-browse', catalogParams],
    queryFn: async () => {
      const res = await fetch(`/api/products?${catalogParams}`);
      if (!res.ok) throw new Error();
      return (await res.json()).data as Product[];
    },
    staleTime: 30_000,
    enabled: tab === 'catalogo',
  });

  // Debounce search input
  const debounceRef = useRef<NodeJS.Timeout>();
  function handleSearchChange(val: string) {
    setSearch(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(val), 300);
  }

  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ['products-for-order', debouncedSearch],
    queryFn: async () => {
      const params = new URLSearchParams({ active: 'true', limit: '9999' });
      if (debouncedSearch) params.set('search', debouncedSearch);
      const res = await fetch(`/api/products?${params}`);
      if (!res.ok) throw new Error();
      return (await res.json()).data as Product[];
    },
    staleTime: 30_000,
    enabled: tab === 'ricerca',
  });

  async function handleAdd(product: Product) {
    const qty = quantities[product.id] ?? product.lotSize ?? 1;
    setAddingId(product.id);
    try {
      const res = await fetch(`/api/orders/${orderId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id, quantity: qty }),
      });
      if (!res.ok) throw new Error();
      toast.success(`${product.code} ✓`);
      onAdded();
    } catch {
      toast.error(addLabel + ' — errore');
    } finally {
      setAddingId(null);
    }
  }

  function renderProductRow(product: Product) {
    const qty = quantities[product.id] ?? product.lotSize ?? 1;
    const isAdding = addingId === product.id;
    return (
      <div
        key={product.id}
        className="flex items-center gap-3 px-4 py-3 border-b border-border/50 hover:bg-cream/50 transition-colors"
      >
        {/* Thumbnail — clickable to open anagrafica */}
        <button
          onClick={() => { setPreviewProduct(product); setGalleryIndex(0); }}
          className="w-14 h-14 flex-shrink-0 bg-[#C8C0B5] overflow-hidden rounded cursor-pointer hover:opacity-80 transition-opacity"
        >
          <ProductImage src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
        </button>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <p className="text-xs font-mono text-gray-400">{product.code}</p>
            {product.collezione === 'CA27' && (
              <span className="bg-black text-white text-[8px] font-bold px-1 py-px rounded-sm leading-none flex-shrink-0">NUOVO</span>
            )}
          </div>
          <button
            onClick={() => { setPreviewProduct(product); setGalleryIndex(0); }}
            className="text-sm text-primary font-medium leading-snug line-clamp-2 text-left hover:underline"
          >
            {product.name}
          </button>
          <p className="text-xs text-gray-400 mt-0.5">{formatCurrency(product.costPrice)}</p>
        </div>

        {/* Qty + Add */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <input
            type="number"
            min={product.lotSize ?? 1}
            step={product.lotSize ?? 1}
            value={qty}
            onChange={(e) =>
              setQuantities((prev) => ({
                ...prev,
                [product.id]: Math.max(1, parseInt(e.target.value) || 1),
              }))
            }
            className="w-16 text-sm text-center border border-border rounded px-2 py-1.5 text-primary"
          />
          <button
            onClick={() => handleAdd(product)}
            disabled={isAdding}
            className="text-sm bg-primary text-white px-4 py-2 rounded hover:bg-primary/90 transition-colors disabled:opacity-50 min-w-[80px]"
          >
            {isAdding ? '…' : 'Aggiungi'}
          </button>
        </div>
      </div>
    );
  }

  const presenzaSelector = (
    <div className="pb-3 mb-1 border-b border-border/50">
      <select
        value={presenzaFilter}
        onChange={e => setPresenzaFilter(e.target.value as 'tutti' | 'non-ancora' | 'gia')}
        className="w-full h-9 border border-primary/30 bg-cream rounded px-2 text-sm text-primary font-medium focus:outline-none"
      >
        <option value="tutti">Tutti i prodotti</option>
        <option value="non-ancora">Non ancora nell&apos;ordine</option>
        <option value="gia">Già nell&apos;ordine</option>
      </select>
    </div>
  );

  const filterSelects = (
    <div className="space-y-2">
      {([
        ['gruppoMerceologico', 'Gruppo merceologico'],
        ['famiglia',           'Famiglia'],
        ['classe',             'Classe'],
        ['sottoclasse',        'Sottoclasse'],
        ['gruppoOmogeneo',     'Gruppo omogeneo'],
        ['nomLinea',           'Linea'],
        ['temaColore',         'Tema colore'],
        ['stagione',           'Stagione'],
        ['collezione',         'Collezione'],
        ['produttore',         'Produttore'],
        ['tranche',            'Tranche'],
      ] as [string, string][]).map(([key, label]) =>
        (fo[key]?.length ?? 0) > 0 ? (
          <select
            key={key}
            value={filters[key] ?? ''}
            onChange={e => setFilters(f => ({ ...f, [key]: e.target.value }))}
            className="w-full h-9 border border-border rounded px-2 text-sm text-primary focus:outline-none bg-white"
          >
            <option value="">{label}</option>
            {fo[key].map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        ) : null
      )}
      {Object.values(filters).some(Boolean) && (
        <button
          onClick={() => setFilters({})}
          className="text-xs text-gray-400 hover:text-primary transition-colors"
        >
          × Azzera filtri
        </button>
      )}
    </div>
  );

  return (
    <div className="apm-overlay">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="apm-panel">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <p className="text-base font-semibold text-primary">{addProductsLabel}</p>
          <button onClick={onClose} className="text-gray-400 hover:text-primary p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X size={20} />
          </button>
        </div>

        {previewProduct ? (
          /* ── Anagrafica prodotto ─────────────────────────────── */
          (() => {
            const photos = [previewProduct.imageUrl, previewProduct.imageUrl2, previewProduct.imageUrl3, previewProduct.imageUrl4].filter(Boolean) as string[];
            const safeIdx = Math.min(galleryIndex, Math.max(0, photos.length - 1));
            const rows: [string, string | null][] = [
              ['Linea', previewProduct.nomLinea],
              ['Famiglia', previewProduct.famiglia],
              ['Classe', previewProduct.classe],
              ['Sottoclasse', previewProduct.sottoclasse],
              ['Gruppo omogeneo', previewProduct.gruppoOmogeneo],
              ['Colore', previewProduct.colore],
              ['Tema colore', previewProduct.temaColore],
              ['Misura', previewProduct.misura],
              ['Produttore', previewProduct.produttore],
              ['Collezione', previewProduct.collezione],
              ['Stagione', previewProduct.stagione],
              ['Tranche', previewProduct.tranche],
            ];
            return (
              <>
                <div className="flex items-center gap-3 px-5 py-3 border-b border-border flex-shrink-0">
                  <button
                    onClick={() => setPreviewProduct(null)}
                    className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary transition-colors"
                  >
                    <ChevronLeft size={16} /> Indietro
                  </button>
                  <span className="text-xs font-mono text-gray-400">{previewProduct.code}</span>
                </div>
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                  {photos.length > 0 && (
                    <div className="flex gap-3">
                      <div className="relative w-40 h-40 flex-shrink-0 bg-cream rounded border border-border overflow-hidden">
                        <ProductImage src={photos[safeIdx]} alt={previewProduct.name} className="w-full h-full object-cover" />
                        {photos.length > 1 && (
                          <>
                            <button onClick={() => setGalleryIndex(i => (i === 0 ? photos.length - 1 : i - 1))} className="absolute left-1 top-1/2 -translate-y-1/2 w-7 h-7 bg-white/80 rounded-full flex items-center justify-center shadow">
                              <ChevronLeft size={14} />
                            </button>
                            <button onClick={() => setGalleryIndex(i => (i === photos.length - 1 ? 0 : i + 1))} className="absolute right-1 top-1/2 -translate-y-1/2 w-7 h-7 bg-white/80 rounded-full flex items-center justify-center shadow">
                              <ChevronRight size={14} />
                            </button>
                          </>
                        )}
                      </div>
                      <div className="flex flex-col gap-1.5">
                        {previewProduct.collezione === 'CA27' && (
                          <span className="inline-flex self-start bg-black text-white text-[8px] font-bold px-1.5 py-0.5 rounded-sm leading-none">NUOVO</span>
                        )}
                        <p className="text-base font-semibold text-primary leading-snug">{previewProduct.name}</p>
                        <div className="mt-1 space-y-0.5">
                          <p className="text-xs text-gray-500">Costo: <span className="font-medium text-primary">{formatCurrency(previewProduct.costPrice)}</span></p>
                          <p className="text-xs text-gray-500">Vendita (s.i.): <span className="font-medium text-primary">{formatCurrency(previewProduct.retailPrice)}</span></p>
                          {previewProduct.lotSize > 1 && (
                            <p className="text-xs text-gray-500">Lotto: <span className="font-medium text-primary">{previewProduct.lotSize} pz</span></p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  {previewProduct.description && (
                    <p className="text-sm text-gray-600 leading-relaxed">{previewProduct.description}</p>
                  )}
                  <div className="border border-border rounded divide-y divide-border/50">
                    {rows.filter(([, v]) => v).map(([label, value]) => (
                      <div key={label} className="flex px-3 py-2">
                        <span className="text-xs text-gray-400 w-32 flex-shrink-0">{label}</span>
                        <span className="text-xs text-primary font-medium">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            );
          })()
        ) : (
          <>
        {/* Tabs */}
        <div className="flex border-b border-border flex-shrink-0">
          <button
            onClick={() => setTab('ricerca')}
            className={`px-5 py-3 text-sm font-medium transition-colors ${tab === 'ricerca' ? 'border-b-2 border-primary text-primary' : 'text-gray-400 hover:text-primary'}`}
          >
            Ricerca
          </button>
          <button
            onClick={() => setTab('catalogo')}
            className={`px-5 py-3 text-sm font-medium transition-colors ${tab === 'catalogo' ? 'border-b-2 border-primary text-primary' : 'text-gray-400 hover:text-primary'}`}
          >
            Sfoglia catalogo
          </button>
        </div>

        {/* Body: sidebar + product list */}
        <div className="flex flex-col md:flex-row flex-1 min-h-0">

          {/* Left panel: search input (ricerca) or filters (catalogo) */}
          <div className="md:w-72 flex-shrink-0 flex flex-col border-b md:border-b-0 md:border-r border-border">
            {tab === 'ricerca' ? (
              <div className="px-4 py-3 space-y-3">
                {presenzaSelector}
                <div className="flex items-center gap-2 border border-border rounded-lg px-3 py-2.5">
                  <Search size={15} className="text-gray-400 flex-shrink-0" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    placeholder={searchPlaceholder}
                    className="flex-1 text-sm outline-none bg-transparent text-primary placeholder-gray-400"
                    autoFocus
                  />
                </div>
              </div>
            ) : (
              <div className="overflow-y-auto px-4 py-3 max-h-48 md:max-h-none md:flex-1">
                {presenzaSelector}
                {filterSelects}
              </div>
            )}
          </div>

          {/* Right: product list */}
          <div className="flex-1 overflow-y-auto">
            {presenzaFilter === 'gia' ? (
              <>
                {giaProducts.length === 0 && (
                  <p className="text-center text-sm text-gray-400 py-12">{noProductsLabel}</p>
                )}
                {giaProducts.map(renderProductRow)}
              </>
            ) : tab === 'ricerca' ? (
              <>
                {isLoading && (
                  <div className="flex items-center justify-center py-12">
                    <LoadingSpinner text={loadingLabel} />
                  </div>
                )}
                {!isLoading && applyPresenzaFilter(products ?? []).length === 0 && (
                  <p className="text-center text-sm text-gray-400 py-12">{noProductsLabel}</p>
                )}
                {applyPresenzaFilter(products ?? []).map(renderProductRow)}
              </>
            ) : (
              <>
                {catalogLoading && (
                  <div className="flex items-center justify-center py-12">
                    <LoadingSpinner text={loadingLabel} />
                  </div>
                )}
                {!catalogLoading && applyPresenzaFilter(catalogProducts ?? []).length === 0 && (
                  <p className="text-center text-sm text-gray-400 py-12">{noProductsLabel}</p>
                )}
                {applyPresenzaFilter(catalogProducts ?? []).map(renderProductRow)}
              </>
            )}
          </div>
        </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main view ──────────────────────────────────────────────────
export default function OrderPreviewView({ id, initialTab }: { id: string; initialTab?: string }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const t = useTranslations('preview');
  const tg = useTranslations('groupings');
  const { mondiEspositivi } = useFeatureFlags();

  const GROUPINGS = GROUPING_KEYS.map((k) => ({ value: k, label: tg(k) }));

  const [viewMode, setViewMode] = useState<'ordine' | 'mondi' | 'calendario'>(() => {
    if (initialTab === 'esposizione') return 'mondi';
    if (initialTab === 'calendario') return 'calendario';
    return 'ordine';
  });
  const [groupBy, setGroupBy] = useState('gruppoMerceologico');
  const [productSearch, setProductSearch] = useState('');
  const [budgetEditing, setBudgetEditing] = useState(false);
  const [budgetInput, setBudgetInput] = useState('');
  const [budgetNota, setBudgetNota] = useState('');
  const [savingBudget, setSavingBudget] = useState(false);
  const [sortBy, setSortBy] = useState<string>(() =>
    typeof window !== 'undefined' ? (localStorage.getItem(PREVIEW_SORT_KEY) ?? 'name-asc') : 'name-asc'
  );
  function handleSortChange(v: string) { setSortBy(v); localStorage.setItem(PREVIEW_SORT_KEY, v); }
  const [qtyOverrides, setQtyOverrides] = useState<QtyMap>({});
  const qtyDebounceRef = useRef<Record<string, NodeJS.Timeout>>({});
  const [exporting, setExporting] = useState(false);

  const [showDemetraInstructions, setShowDemetraInstructions] = useState(false);
  const [addProductsOpen, setAddProductsOpen] = useState(false);
  const tabsRef = useRef<HTMLDivElement>(null);

  // ── Change destination ─────────────────────────────────────
  const [showChangeDestModal, setShowChangeDestModal] = useState(false);
  const [newCanaleId, setNewCanaleId] = useState('');
  const [changingDest, setChangingDest] = useState(false);

  // ── Duplicate order ────────────────────────────────────────
  const [showDupModal, setShowDupModal] = useState(false);
  const [dupCanaleId, setDupCanaleId] = useState('');
  const [duplicating, setDuplicating] = useState(false);

  const { data: destData } = useQuery<{ data: Destinazione[] }>({
    queryKey: ['catalog-destinazioni-preview'],
    queryFn: () => fetch('/api/catalog/destinazioni').then((r) => r.json()),
    enabled: showChangeDestModal || showDupModal,
    staleTime: 60_000,
  });
  const destinazioni = destData?.data ?? [];

  const { data: order, isLoading, error } = useQuery<Order>({
    queryKey: ['order-preview', id],
    queryFn: async () => {
      const res = await fetch(`/api/orders/${id}`);
      if (!res.ok) throw new Error('Ordine non trovato');
      return (await res.json()).data as Order;
    },
  });

  const { data: displayGroupsData } = useQuery<{ groups: { id: string }[] }>({
    queryKey: ['display-groups', id],
    queryFn: () => fetch(`/api/catalog/orders/${id}/display-groups`).then(r => r.json()),
    enabled: mondiEspositivi,
    staleTime: 15_000,
    select: (d) => ({ groups: d.groups.map((g: any) => ({ id: g.id })) }),
  });
  const displayGroupCount = displayGroupsData?.groups.length ?? 0;

  async function handleSaveBudget() {
    setSavingBudget(true);
    try {
      const res = await fetch(`/api/catalog/orders/${id}/budget`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          budgetPersonalizzato: budgetInput ? Number(budgetInput) : null,
          budgetNota: budgetNota || null,
        }),
      });
      if (!res.ok) throw new Error();
      queryClient.invalidateQueries({ queryKey: ['order-preview', id] });
      setBudgetEditing(false);
      toast.success('Budget salvato');
    } catch { toast.error('Errore nel salvataggio'); }
    setSavingBudget(false);
  }

  // Items with effective qty / subtotal (local optimistic overrides)
  const items = useMemo(
    () =>
      (order?.items ?? [])
        .filter((it) => it.product != null)
        .map((it) => {
          const qty = qtyOverrides[it.id] ?? it.quantity;
          return { ...it, effectiveQty: qty, effectiveSubtotal: qty * Number(it.unitPrice) };
        }),
    [order?.items, qtyOverrides]
  );

  // Search filter (works on top of groupBy grouping)
  const filteredItems = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return items;
    return items.filter(it =>
      (it.product?.name ?? '').toLowerCase().includes(q) ||
      (it.product?.code ?? '').toLowerCase().includes(q)
    );
  }, [items, productSearch]);

  // Groups computed client-side from current groupBy
  const unclassifiedLabel = t('unclassified');
  const groups = useMemo(() => {
    const map = new Map<string, typeof filteredItems>();
    for (const item of filteredItems) {
      const key = (item.product as any)?.[groupBy] || unclassifiedLabel;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b, 'it'))
      .map(([name, grpItems]) => {
        const sorted = sortGroupItems(grpItems, sortBy);
        return {
          name,
          items: sorted,
          subtotal: grpItems.reduce((s, it) => s + it.effectiveSubtotal, 0),
          totalQty: grpItems.reduce((s, it) => s + it.effectiveQty, 0),
        };
      });
  }, [filteredItems, groupBy, sortBy]);

  const grandTotal = useMemo(() => items.reduce((s, it) => s + it.effectiveSubtotal, 0), [items]);
  const grandQty   = useMemo(() => items.reduce((s, it) => s + it.effectiveQty, 0),   [items]);

  function handleQtyChange(itemId: string, qty: number) {
    if (qty < 1) return;
    // Immediate optimistic update
    setQtyOverrides((prev) => ({ ...prev, [itemId]: qty }));
    // Debounce the API call: cancel previous timer, fire 500ms after last click
    if (qtyDebounceRef.current[itemId]) clearTimeout(qtyDebounceRef.current[itemId]);
    qtyDebounceRef.current[itemId] = setTimeout(async () => {
      try {
        const res = await fetch(`/api/orders/${id}/items/${itemId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quantity: qty }),
        });
        if (!res.ok) throw new Error();
        queryClient.invalidateQueries({ queryKey: ['my-orders'] });
      } catch {
        // Revert to server value on failure
        setQtyOverrides((prev) => {
          const next = { ...prev };
          delete next[itemId];
          return next;
        });
        toast.error(t('updateQtyError'));
      }
    }, 500);
  }

  async function handleRemove(itemId: string) {
    try {
      const res = await fetch(`/api/orders/${id}/items/${itemId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      queryClient.invalidateQueries({ queryKey: ['order-preview', id] });
      queryClient.invalidateQueries({ queryKey: ['my-orders'] });
      setQtyOverrides((prev) => {
        const n = { ...prev };
        delete n[itemId];
        return n;
      });
      toast.success(t('removeSuccess'));
    } catch {
      toast.error(t('removeError'));
    }
  }

  async function handleExportPDF() {
    setExporting(true);
    try {
      const res = await fetch(`/api/orders/${id}/pdf-classification?groupBy=${groupBy}`);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const label = groupBy.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ordine-${id.slice(0, 8)}-per-${label}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(t('pdfReady'));
    } catch {
      toast.error(t('pdfError'));
    } finally {
      setExporting(false);
    }
  }


  async function handleChangeDest() {
    setChangingDest(true);
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ canaleId: newCanaleId || null }),
      });
      if (!res.ok) throw new Error();
      queryClient.invalidateQueries({ queryKey: ['order-preview', id] });
      queryClient.invalidateQueries({ queryKey: ['my-orders'] });
      setShowChangeDestModal(false);
      toast.success('Destinazione aggiornata');
    } catch {
      toast.error('Errore nell\'aggiornamento della destinazione');
    } finally {
      setChangingDest(false);
    }
  }

  async function handleDuplicate() {
    if (!dupCanaleId) return;
    setDuplicating(true);
    try {
      const orderItems = (order?.items ?? []).map((i: any) => ({
        productId: i.productId,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
      }));
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: orderItems, canaleId: dupCanaleId }),
      });
      if (!res.ok) throw new Error();
      const { data: newOrder } = await res.json();
      toast.success('Ordine duplicato con successo');
      router.push(`/catalog/orders/${newOrder.id}/preview`);
    } catch {
      toast.error('Errore nella duplicazione dell\'ordine');
    } finally {
      setDuplicating(false);
    }
  }

  const currentGroupLabel = GROUPINGS.find((g) => g.value === groupBy)?.label ?? '';

  // ── Loading / error states ─────────────────────────────────
  if (isLoading) return <LoadingSpinner fullPage text={t('loadingOrder')} />;
  if (error || !order) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-4">
        <p className="text-sm text-gray-500">{t('notFound')}</p>
        <Link href="/catalog/orders" className="mt-3 text-sm text-accent hover:underline">
          ← {t('backToOrders')}
        </Link>
      </div>
    );
  }

  // ── Main render ────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-full">

      {showDemetraInstructions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowDemetraInstructions(false)} />
          <div className="relative bg-white rounded-lg shadow-2xl w-full max-w-md z-10 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <p className="text-sm font-semibold text-primary">Importa in Demetra</p>
                <p className="text-2xs text-gray-400 mt-0.5">Il file CSV è stato scaricato. Segui questi passi.</p>
              </div>
              <button onClick={() => setShowDemetraInstructions(false)} className="text-gray-400 hover:text-primary p-1 transition-colors">
                <X size={16} />
              </button>
            </div>
            <ol className="px-5 py-4 space-y-3">
              {[
                <>Vai in <span className="font-medium">Proposte di prenotazione</span> › <span className="font-medium">Proposte attive</span> › <span className="font-medium">Nuova prenotazione</span>, compila i campi e clicca <span className="font-medium">Crea prenotazione</span> (in Cliente seleziona <span className="font-medium">Prenotazioni dirette</span>).</>,
                <>Nella finestra successiva inserisci la destinazione e gli altri campi, poi clicca il pulsante blu <span className="font-medium">Carica da file</span>.</>,
                <>Si apre una nuova finestra: clicca il pulsante grigio <span className="font-medium">Scegli file</span>, seleziona il CSV appena scaricato, poi clicca il pulsante verde <span className="font-medium">Carica da file</span>.</>,
                <>Prosegui e conferma la prenotazione.</>,
              ].map((step, i) => (
                <li key={i} className="flex gap-3 text-sm text-gray-600">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary text-white text-2xs font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                  <span className="leading-snug">{step}</span>
                </li>
              ))}
            </ol>
            <div className="px-5 pb-5">
              <button
                onClick={() => setShowDemetraInstructions(false)}
                className="w-full py-2.5 text-xs font-medium bg-primary text-background rounded hover:bg-warm-darker transition-colors"
              >
                Ho capito
              </button>
            </div>
          </div>
        </div>
      )}

      {addProductsOpen && (
        <AddProductsModal
          orderId={id}
          onClose={() => setAddProductsOpen(false)}
          addProductsLabel={t('addProducts')}
          searchPlaceholder={t('searchPlaceholder')}
          loadingLabel={t('loading')}
          noProductsLabel={t('noProducts')}
          addLabel={t('add')}
          orderProductIds={new Set((order?.items ?? []).map(i => i.productId))}
          orderItems={order?.items ?? []}
          onAdded={() => {
            queryClient.invalidateQueries({ queryKey: ['order-preview', id] });
            queryClient.invalidateQueries({ queryKey: ['my-orders'] });
          }}
        />
      )}

      {/* Change destination modal */}
      {showChangeDestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowChangeDestModal(false)} />
          <div className="relative bg-white rounded-lg shadow-2xl w-full max-w-sm p-6 z-10">
            <h3 className="text-sm font-semibold text-primary mb-1 tracking-wide">Cambia destinazione</h3>
            <p className="text-xs text-gray-400 mb-3">Seleziona la destinazione da associare a questo ordine.</p>
            <select
              value={newCanaleId}
              onChange={(e) => setNewCanaleId(e.target.value)}
              className="w-full px-3 py-2.5 bg-white border border-border rounded text-sm text-primary focus:outline-none focus:border-accent mb-4"
            >
              <option value="">— Nessuna —</option>
              {destinazioni.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.tipo}{d.citta ? ` · ${d.citta}` : ''}
                </option>
              ))}
            </select>
            <div className="flex gap-3">
              <button
                onClick={() => setShowChangeDestModal(false)}
                className="flex-1 py-2 text-xs border border-border rounded text-gray-500 hover:bg-cream transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={handleChangeDest}
                disabled={changingDest}
                className="flex-1 py-2 text-xs bg-primary text-white rounded hover:bg-primary/90 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {changingDest ? <Loader2 size={11} className="animate-spin" /> : 'Salva'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate order modal */}
      {showDupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowDupModal(false)} />
          <div className="relative bg-white rounded-lg shadow-2xl w-full max-w-sm p-6 z-10">
            <h3 className="text-sm font-semibold text-primary mb-1 tracking-wide">Duplica ordine</h3>
            <p className="text-xs text-gray-400 mb-3">Seleziona la destinazione per il nuovo ordine.</p>
            <select
              value={dupCanaleId}
              onChange={(e) => setDupCanaleId(e.target.value)}
              className="w-full px-3 py-2.5 bg-white border border-border rounded text-sm text-primary focus:outline-none focus:border-accent mb-4"
            >
              <option value="">— Seleziona destinazione —</option>
              {destinazioni.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.tipo}{d.citta ? ` · ${d.citta}` : ''}
                </option>
              ))}
            </select>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDupModal(false)}
                className="flex-1 py-2 text-xs border border-border rounded text-gray-500 hover:bg-cream transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={handleDuplicate}
                disabled={duplicating || !dupCanaleId}
                className="flex-1 py-2 text-xs bg-primary text-white rounded hover:bg-primary/90 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {duplicating ? <Loader2 size={11} className="animate-spin" /> : <><Copy size={11} /> Duplica</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Page header ──────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-white border-b border-border">
        <div className="px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/catalog/orders"
              className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-primary hover:bg-cream rounded transition-colors"
            >
              <ArrowLeft size={16} />
            </Link>
            <div>
              <p className="text-2xs font-medium tracking-widest uppercase text-gray-400 leading-none">
                {t('title')}
              </p>
              <p className="text-sm font-semibold text-primary tracking-wide">
                {order.orderNumber ?? `#${order.id.slice(0, 8).toUpperCase()}`}
              </p>
            </div>
          </div>
          <div className="text-right text-xs text-gray-500">
            <p>{items.length} art. · {grandQty} pz.</p>
            <p className="font-semibold text-primary text-sm">{formatCurrency(grandTotal)}</p>
            {/* Budget bar */}
            {mondiEspositivi && order.budgetPersonalizzato && !budgetEditing && (() => {
              const budget = Number(order.budgetPersonalizzato);
              const pct = Math.min(100, (grandTotal / budget) * 100);
              const over = grandTotal > budget;
              return (
                <div className="mt-1 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <span className={`text-2xs ${over ? 'text-[#C17A5A]' : 'text-[#8FAF8F]'}`}>
                      {over ? '+' : ''}{formatCurrency(grandTotal - budget)}
                    </span>
                    <button onClick={() => { setBudgetEditing(true); setBudgetInput(String(budget)); setBudgetNota(order.budgetNota ?? ''); }}
                      className="text-gray-300 hover:text-gray-400 transition-colors">
                      <Pencil size={10} />
                    </button>
                  </div>
                  <div className="w-28 h-1.5 bg-gray-100 rounded-full overflow-hidden ml-auto mt-0.5">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: over ? '#C17A5A' : '#8FAF8F' }}
                    />
                  </div>
                  <p className="text-2xs text-gray-400 mt-0.5">budget {formatCurrency(budget)}</p>
                </div>
              );
            })()}
            {mondiEspositivi && !order.budgetPersonalizzato && !budgetEditing && (
              <button
                onClick={() => { setBudgetEditing(true); setBudgetInput(''); setBudgetNota(''); }}
                className="text-2xs text-gray-300 hover:text-gray-400 mt-0.5 block ml-auto transition-colors"
              >
                + budget
              </button>
            )}
            {mondiEspositivi && budgetEditing && (
              <div className="flex items-center gap-1 mt-1 justify-end">
                <input
                  type="number" min={0} step={100}
                  value={budgetInput}
                  onChange={e => setBudgetInput(e.target.value)}
                  placeholder="Budget €"
                  className="text-xs border border-border rounded px-1.5 py-0.5 w-24 text-right"
                />
                <button onClick={handleSaveBudget} disabled={savingBudget}
                  className="text-[#8FAF8F] hover:opacity-70 disabled:opacity-50">
                  {savingBudget ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                </button>
                <button onClick={() => setBudgetEditing(false)} className="text-gray-400 hover:text-primary">
                  <X size={12} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Vista toggle (Mondi Espositivi) ───────────────── */}
      {mondiEspositivi && (
        <div className="sticky top-[57px] z-20 bg-white border-b border-border px-3 sm:px-6 py-2 flex gap-1.5 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          <button
            onClick={() => setViewMode('ordine')}
            className={`flex-shrink-0 flex items-center gap-1.5 text-sm px-3 py-2 rounded transition-colors ${
              viewMode === 'ordine'
                ? 'bg-primary text-white'
                : 'text-gray-500 hover:bg-cream border border-border'
            }`}
          >
            Ordine
          </button>
          <button
            onClick={() => setViewMode('mondi')}
            className={`flex-shrink-0 flex items-center gap-1.5 text-sm px-3 py-2 rounded transition-colors ${
              viewMode === 'mondi'
                ? 'bg-primary text-white'
                : 'text-gray-500 hover:bg-cream border border-border'
            }`}
          >
            <Layers size={14} />
            Esposizione
            {displayGroupCount > 0 && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                viewMode === 'mondi' ? 'bg-white/20 text-white' : 'bg-cream text-primary'
              }`}>{displayGroupCount}</span>
            )}
          </button>
          <button
            onClick={() => setViewMode('calendario')}
            className={`flex-shrink-0 flex items-center gap-1.5 text-sm px-3 py-2 rounded transition-colors ${
              viewMode === 'calendario'
                ? 'bg-primary text-white'
                : 'text-gray-500 hover:bg-cream border border-border'
            }`}
          >
            <CalendarDays size={14} />
            Calendario
          </button>
        </div>
      )}

      {/* ── Mondi Espositivi view ──────────────────────────── */}
      {mondiEspositivi && viewMode === 'mondi' && (
        <DisplayGroupsManager orderId={id} orderItems={order.items ?? []} />
      )}

      {/* ── Calendario view ────────────────────────────────── */}
      {mondiEspositivi && viewMode === 'calendario' && (
        <CalendarioEsposizione orderId={id} />
      )}

      {/* ── Vista ordine (hidden when mondi/calendario active) */}
      {viewMode === 'ordine' && mondiEspositivi && displayGroupCount === 0 && (
        <div className="mx-4 sm:mx-6 mt-4 rounded-xl border border-[#E8DDD0] bg-[#F5F0E8] px-5 py-4 flex items-start gap-4">
          <Layers size={20} className="text-[#C17A5A] flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-primary">Organizza l&apos;esposizione in negozio</p>
            <p className="text-xs text-gray-500 mt-0.5">Raggruppa i prodotti in esposizioni e pianifica le settimane di esposizione.</p>
          </div>
          <button
            onClick={() => setViewMode('mondi')}
            className="flex-shrink-0 text-xs bg-primary text-white px-3 py-1.5 rounded hover:bg-primary/90 transition-colors"
          >
            Inizia
          </button>
        </div>
      )}

      {viewMode === 'ordine' && <>

      {/* ── Grouping tabs ─────────────────────────────────── */}
      <div className="sticky z-10 bg-white border-b border-border" style={{ top: mondiEspositivi ? 104 : 57 }}>
        <div
          ref={tabsRef}
          className="flex overflow-x-auto scrollbar-none px-4 sm:px-6"
          style={{ scrollbarWidth: 'none' }}
        >
          {GROUPINGS.map((g) => (
            <button
              key={g.value}
              onClick={() => setGroupBy(g.value)}
              className={`
                flex-shrink-0 px-3 py-2.5 text-xs font-medium whitespace-nowrap transition-colors
                border-b-2
                ${groupBy === g.value
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-400 hover:text-primary hover:border-border'
                }
              `}
            >
              {g.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 px-4 sm:px-6 py-1.5 border-t border-border/40">
          <span className="text-2xs text-gray-400 flex-shrink-0">Ordina:</span>
          <select
            value={sortBy}
            onChange={(e) => handleSortChange(e.target.value)}
            className="text-2xs border border-border rounded px-1.5 py-0.5 bg-white text-primary focus:outline-none cursor-pointer flex-shrink-0"
          >
            {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <div className="flex-1" />
          <div className="flex items-center gap-1 border border-border rounded px-2 py-0.5 bg-white w-48">
            <Search size={11} className="text-gray-400 flex-shrink-0" />
            <input
              type="text"
              value={productSearch}
              onChange={e => setProductSearch(e.target.value)}
              placeholder="Cerca per nome o codice"
              className="flex-1 text-2xs outline-none bg-transparent text-primary placeholder-gray-300"
            />
            {productSearch && (
              <button onClick={() => setProductSearch('')} className="text-gray-300 hover:text-gray-500 flex-shrink-0">
                <X size={9} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Destination info bar ──────────────────────────── */}
      {order.destinazione && (
        <div className="px-4 sm:px-6 py-2 bg-cream/50 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <MapPin size={11} className="text-gray-400 flex-shrink-0" />
            <span>{order.destinazione.tipo}{order.destinazione.citta ? ` · ${order.destinazione.citta}` : ''}</span>
          </div>
          {order.status !== 'ESPORTATO' && (
            <button
              onClick={() => { setNewCanaleId(order.canaleId ?? ''); setShowChangeDestModal(true); }}
              className="text-xs text-accent hover:text-accent/80 transition-colors flex-shrink-0"
            >
              Cambia
            </button>
          )}
        </div>
      )}

      {/* ── Content ───────────────────────────────────────── */}
      <div className="flex-1 px-4 sm:px-6 py-6 pb-32 lg:pb-24">
        {groups.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-16">
            {productSearch ? `Nessun prodotto per "${productSearch}"` : t('noItems')}
          </p>
        )}

        {groups.map((group) => (
          <section key={group.name} className="mb-10">
            {/* Group header */}
            <div className="bg-primary text-white px-4 py-3 flex items-center justify-between mb-4">
              <div>
                <p className="text-xs font-bold tracking-[0.12em] uppercase">{group.name}</p>
                <p className="text-2xs text-gray-400 mt-0.5">
                  {group.items.length} {group.items.length === 1 ? t('articleSingular') : t('articlePlural')}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xs text-gray-400">{t('subtotal')}</p>
                <p className="text-sm font-bold">{formatCurrency(group.subtotal)}</p>
              </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {group.items.map((item) => (
                <ProductCard
                  key={item.id}
                  item={item}
                  effectiveQty={item.effectiveQty}
                  effectiveSubtotal={item.effectiveSubtotal}
                  onQtyChange={handleQtyChange}
                  onRemove={handleRemove}
                  removeLabel={t('remove')}
                  decreaseLabel={t('decrease')}
                  increaseLabel={t('increase')}
                />
              ))}
            </div>

            {/* Group subtotal line */}
            <div className="flex justify-end items-center gap-3 mt-4 pt-3 border-t border-border/50 text-xs">
              <span className="text-gray-400 uppercase tracking-widest">
                {t('subtotal')} {group.name}
              </span>
              <span className="font-semibold text-primary text-sm">
                {formatCurrency(group.subtotal)}
              </span>
            </div>
          </section>
        ))}

        {/* ── Riepilogo ─────────────────────────────────────── */}
        {groups.length > 1 && (
          <section className="mt-4 mb-8 border border-border rounded overflow-hidden">
            <div className="bg-cream/50 px-4 py-2 border-b border-border">
              <p className="text-2xs font-bold tracking-[0.12em] uppercase text-gray-500">Riepilogo</p>
            </div>
            <table className="w-full text-xs">
              <tbody>
                {groups.map((group) => (
                  <tr key={group.name} className="border-b border-border/40 last:border-0">
                    <td className="px-4 py-2 text-primary">{group.name}</td>
                    <td className="px-4 py-2 text-right text-gray-500">{group.totalQty} pz</td>
                    <td className="px-4 py-2 text-right font-medium text-primary">{formatCurrency(group.subtotal)}</td>
                  </tr>
                ))}
                <tr className="bg-primary text-white">
                  <td className="px-4 py-2.5 font-bold uppercase tracking-wide text-xs">TOTALE</td>
                  <td className="px-4 py-2.5 text-right font-bold">{grandQty} pz</td>
                  <td className="px-4 py-2.5 text-right font-bold text-sm">{formatCurrency(grandTotal)}</td>
                </tr>
              </tbody>
            </table>
          </section>
        )}
      </div>

      {/* ── Fixed footer ──────────────────────────────────── */}
      <div className="
        fixed above-mobile-nav left-0 right-0 z-20
        lg:bottom-0 lg:right-80 xl:right-[340px]
        bg-white border-t border-border shadow-[0_-2px_8px_rgba(0,0,0,0.06)]
      ">
        <div className="px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          {/* Back */}
          <Link
            href="/catalog/orders"
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary transition-colors flex-shrink-0"
          >
            <ArrowLeft size={14} />
            <span className="hidden sm:inline">{t('back')}</span>
          </Link>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Add products */}
            <button
              onClick={() => setAddProductsOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs border border-border rounded hover:bg-cream transition-colors text-gray-600 hover:text-primary flex-shrink-0"
            >
              <Plus size={12} />
              <span className="hidden sm:inline">{t('addProducts')}</span>
            </button>

            {/* PDF export */}
            <button
              onClick={handleExportPDF}
              disabled={exporting}
              className="flex items-center gap-1.5 px-3 py-2 text-xs border border-border rounded hover:bg-cream transition-colors text-gray-600 hover:text-primary disabled:opacity-50 flex-shrink-0"
            >
              <FileText size={12} />
              <span className="hidden sm:inline">
                {exporting ? t('generating') : `PDF · ${currentGroupLabel}`}
              </span>
              <span className="sm:hidden">PDF</span>
            </button>

            {/* Esporta Excel completo */}
            <OrderExcelExport orderId={id} />

            {/* Duplica ordine */}
            <button
              onClick={() => { setDupCanaleId(order.canaleId ?? ''); setShowDupModal(true); }}
              className="flex items-center gap-1.5 px-3 py-2 text-xs border border-border rounded hover:bg-cream transition-colors text-gray-600 hover:text-primary flex-shrink-0"
            >
              <Copy size={12} />
              <span className="hidden sm:inline">Duplica</span>
            </button>

            {/* Esporta in Demetra — dropdown con completo/tranche/Excel */}
            <OrderDemetraExport
              order={order}
              onExported={() => setShowDemetraInstructions(true)}
            />
          </div>

          {/* Total */}
          <div className="text-right flex-shrink-0">
            <p className="text-2xs text-gray-400 uppercase tracking-widest hidden sm:block">{t('total')}</p>
            <p className="text-base font-bold text-primary">{formatCurrency(grandTotal)}</p>
          </div>
        </div>
      </div>

      </> /* end viewMode === 'ordine' */}

    </div>
  );
}
