'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Plus, X, Search, Loader2, ChevronLeft, ChevronRight,
  Trash2, Edit2, Check, Tag, PackagePlus, AlertTriangle, ZoomIn, ZoomOut,
  SlidersHorizontal, ChevronDown,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type {
  PareteAttrezzata, ElementoParete, ItemParete,
  TipoCapo, TipoElementoParete, DimensioneMensola, DimensioneBarra,
  MensolaInlineConfig, PosizioneMensola, Cart, Order,
} from '@/types';
import type { Product } from '@/types';
import { nanoid } from 'nanoid';

// ─── Constants ───────────────────────────────────────────────────────────────

function colorForTipo(tipo: TipoCapo): string {
  const map: Record<TipoCapo, string> = {
    top: '#4f7c9c', bottom: '#6b5a8c', abito: '#8c5a7c',
    capospalla: '#4a6b4a', borsa: '#8c7a4a', accessorio: '#8c6a4a', altro: '#9ca3af',
  };
  return map[tipo] ?? '#9ca3af';
}

const TIPO_LABELS: Record<TipoCapo, string> = {
  top: 'Top', bottom: 'Bottom', abito: 'Abito',
  capospalla: 'Capospalla', borsa: 'Borsa', accessorio: 'Accessorio', altro: 'Altro',
};

const TIPO_OPTIONS_BARRA: TipoCapo[] = ['capospalla', 'top', 'bottom', 'abito'];
const TIPO_OPTIONS_MENSOLA: TipoCapo[] = ['borsa', 'accessorio', 'top', 'bottom', 'abito', 'altro'];
const TIPO_OPTIONS_FRONTALE: TipoCapo[] = ['abito', 'capospalla', 'top', 'bottom', 'borsa', 'accessorio', 'altro'];

const TAGLIE_FULL = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'TU'];

const BARRA_MAX_PZ: Record<DimensioneBarra, number> = { piccola: 24, media: 36, grande: 48 };
const BARRA_DIMS: DimensioneBarra[] = ['piccola', 'media', 'grande'];
const MENSOLA_DIMS: DimensioneMensola[] = ['piccola', 'media', 'lunga'];

const BARRA_PATTERN: Record<DimensioneBarra, TipoCapo[]> = {
  piccola: ['top', 'bottom', 'top', 'bottom', 'top', 'bottom'],
  media:   ['top', 'top', 'bottom', 'top', 'top', 'bottom', 'top', 'top', 'bottom'],
  grande:  ['top', 'top', 'bottom', 'top', 'top', 'bottom', 'top', 'top', 'bottom', 'top', 'top', 'bottom'],
};

const UNIT = 80;
const COSTA_W = 16;
const FRONTALE_W = COSTA_W * 3;
const FRONTALE_H = 120;
const FRONTALE_TOP_H = 48;
const FRONTALE_BOT_H = 72;
const STRATO_H = 7;
const MENSOLA_W: Record<DimensioneMensola, number> = { piccola: UNIT, media: UNIT * 2, lunga: UNIT * 3 };

// ─── Color harmony (ruota cromatica integration) ─────────────────────────────

function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    h = max === r ? ((g - b) / d + (g < b ? 6 : 0)) / 6
      : max === g ? ((b - r) / d + 2) / 6
      : ((r - g) / d + 4) / 6;
  }
  return [h * 360, s, l];
}

function hslToHex(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360;
  const hk = h / 360;
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const toC = (t: number) => {
    t = ((t % 1) + 1) % 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const r = Math.round(toC(hk + 1 / 3) * 255);
  const g = Math.round(toC(hk) * 255);
  const b = Math.round(toC(hk - 1 / 3) * 255);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function getColorHarmony(hex: string): string[] | null {
  if (!hex || !hex.startsWith('#') || hex.length < 7) return null;
  try {
    const [h, s, l] = hexToHsl(hex);
    return [hslToHex(h + 180, s, l), hslToHex(h + 30, s, l), hslToHex(h - 30, s, l)];
  } catch { return null; }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function totalePezzi(items: ItemParete[]): number {
  return items.reduce((acc, it) => acc + it.pezzi.length, 0);
}

function hexFromProduct(p: Product): string | undefined {
  return p.pantoneColors?.find((pc) => pc.isPrimary)?.hex_code ?? p.pantoneColors?.[0]?.hex_code;
}

// Uppercase the model name portion within the display name
function formatProductName(p: Product): string {
  if (!p.modello) return p.name;
  const escaped = p.modello.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return p.name.replace(new RegExp(escaped, 'i'), p.modello.toUpperCase());
}

// Use imageUrl with imageUrl2 as fallback
function productImageUrl(p: Product): string | undefined {
  return p.imageUrl ?? p.imageUrl2 ?? undefined;
}

function tipoFromProduct(p: Product, elementoTipo: TipoElementoParete): TipoCapo {
  const fam = (p.famiglia ?? '').toLowerCase();
  const sf = (p.sottofamiglia ?? '').toLowerCase();
  const name = p.name.toLowerCase();
  const all = fam + ' ' + sf + ' ' + name;
  if (/bijou|bigiotteria|gioiell|collana|bracciale|orecchino|anello|spilla|pendente|charm/.test(all)) return 'accessorio';
  if (/borsa|bag|clutch|tote|shopper|zaino|backpack|bauletto|pochette|marsupio/.test(all)) return 'borsa';
  if (/foulard|sciarpa|stola|cintura|cappello|guanti|occhiali|belt|hat|scarf|accessori|portafoglio|wallet/.test(all)) return 'accessorio';
  if (/abito|vestito|dress|tuta|jumpsuit/.test(all)) return 'abito';
  if (/giaccone|cappotto|giubbott|parka|blazer|trench|coat|jacket|mantella/.test(all)) return 'capospalla';
  if (/pantal|gonna|skirt|short|legging|trouser|culotte/.test(all)) return 'bottom';
  if (/top|shirt|blusa|camicia|maglia|felpa|maglione|pull|sweat|t-shirt|tshirt|canotta/.test(all)) return 'top';
  if (elementoTipo === 'mensola') return 'borsa';
  if (elementoTipo === 'frontale') return 'abito';
  return 'top';
}

function availableTaglieFromProduct(p: Product): string[] | undefined {
  if (!p.sizeVariants?.length) return undefined;
  return p.sizeVariants.map((sv) => sv.taglia.toUpperCase());
}

// ─── Product sheet modal ──────────────────────────────────────────────────────

function ProductSheetModal({ item, onClose }: { item: ItemParete; onClose: () => void }) {
  const { data, isLoading } = useQuery<{ data: Product }>({
    queryKey: ['product-detail', item.productId],
    queryFn: () => fetch(`/api/products/${item.productId}`).then((r) => r.json()),
    enabled: !!item.productId,
    staleTime: 120_000,
  });

  const product = data?.data;
  const displayName = product ? formatProductName(product) : (item.productName ?? '—');
  const img = product ? productImageUrl(product) : item.imageUrl;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-white border border-gray-200 rounded-t-2xl sm:rounded-2xl flex flex-col max-h-[80vh] shadow-xl">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
          <p className="flex-1 text-sm font-semibold text-gray-900 truncate">{displayName}</p>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 flex-shrink-0"><X size={18} /></button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-gray-300" /></div>
        ) : (
          <div className="overflow-y-auto flex-1 p-4 space-y-4">
            {img && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={img} alt={displayName} className="w-full max-h-48 object-contain rounded-lg border border-gray-100 bg-gray-50" />
            )}
            {product?.famiglia && (
              <p className="text-xs text-gray-500">{[product.famiglia, product.sottofamiglia, product.colore].filter(Boolean).join(' · ')}</p>
            )}

            {product?.sizeVariants?.length ? (
              <div>
                <p className="text-xs font-medium text-gray-700 mb-2">Taglie e codici</p>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-1 text-gray-400 font-normal">Taglia</th>
                      <th className="text-left py-1 text-gray-400 font-normal font-mono">Codice</th>
                    </tr>
                  </thead>
                  <tbody>
                    {product.sizeVariants.map((sv) => (
                      <tr key={sv.codice} className="border-b border-gray-50">
                        <td className="py-1.5 text-gray-700 font-medium">{sv.taglia.toUpperCase()}</td>
                        <td className="py-1.5 text-gray-500 font-mono">{sv.codice}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : product?.code ? (
              <div>
                <p className="text-xs font-medium text-gray-700 mb-1">Codice</p>
                <p className="text-sm font-mono text-gray-600">{product.code}</p>
              </div>
            ) : null}
          </div>
        )}

        <div className="px-4 py-3 border-t border-gray-100">
          <button onClick={onClose} className="w-full py-2 text-xs text-gray-500 hover:text-gray-700 transition-colors">Chiudi</button>
        </div>
      </div>
    </div>
  );
}

// ─── Add product modal (multi-select, with source tabs + filters) ─────────────

type SourceTab = 'tutti' | 'carrello' | 'ordine';

function AddProductModal({
  elementoTipo, onAdd, onClose,
}: {
  elementoTipo: TipoElementoParete; onAdd: (items: ItemParete[]) => void; onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sourceTab, setSourceTab] = useState<SourceTab>('tutti');
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterFamiglia, setFilterFamiglia] = useState('');
  const [filterClasse, setFilterClasse] = useState('');
  const [filterSottoclasse, setFilterSottoclasse] = useState('');
  const [filterColore, setFilterColore] = useState('');

  const { data: productsData, isLoading: productsLoading } = useQuery<{ data: Product[] }>({
    queryKey: ['moda-products-visual'],
    queryFn: () => fetch(`/api/products?active=true&gruppoMerceologico=Moda&limit=500`).then((r) => r.json()),
    staleTime: 60_000,
  });

  const { data: cartsData, isLoading: cartsLoading } = useQuery<{ data: Cart[] }>({
    queryKey: ['catalog-carts-visual'],
    queryFn: () => fetch('/api/catalog/carts').then((r) => r.json()),
    staleTime: 30_000,
    enabled: sourceTab === 'carrello',
  });

  const { data: ordersData, isLoading: ordersLoading } = useQuery<{ data: Order[]; total: number }>({
    queryKey: ['orders-for-visual'],
    queryFn: () => fetch('/api/orders?my=true&limit=30').then((r) => r.json()),
    staleTime: 30_000,
    enabled: sourceTab === 'ordine',
  });

  const allProducts = productsData?.data ?? [];
  const orders = ordersData?.data ?? [];

  const cartProductIds = useMemo<Set<string> | null>(() => {
    const cart = cartsData?.data?.[0];
    if (!cart) return null;
    return new Set(cart.items.map((i) => i.productId));
  }, [cartsData]);

  const orderProductIds = useMemo<Set<string> | null>(() => {
    if (!selectedOrderId) return null;
    const order = orders.find((o) => o.id === selectedOrderId);
    if (!order?.items?.length) return null;
    return new Set(order.items.map((i) => i.productId));
  }, [orders, selectedOrderId]);

  const sourceProducts = useMemo(() => {
    if (sourceTab === 'carrello' && cartProductIds) return allProducts.filter((p) => cartProductIds.has(p.id));
    if (sourceTab === 'ordine' && orderProductIds) return allProducts.filter((p) => orderProductIds.has(p.id));
    return allProducts;
  }, [allProducts, sourceTab, cartProductIds, orderProductIds]);

  const filterOptions = useMemo(() => ({
    famiglie: [...new Set(allProducts.map((p) => p.famiglia).filter(Boolean) as string[])].sort(),
    classi: [...new Set(allProducts.map((p) => p.classe).filter(Boolean) as string[])].sort(),
    sottoclassi: [...new Set(allProducts.map((p) => p.sottoclasse).filter(Boolean) as string[])].sort(),
    colori: [...new Set(allProducts.map((p) => p.colore).filter(Boolean) as string[])].sort(),
  }), [allProducts]);

  const filtered = useMemo(() => {
    let list = sourceProducts;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) => formatProductName(p).toLowerCase().includes(q));
    }
    if (filterFamiglia) list = list.filter((p) => p.famiglia === filterFamiglia);
    if (filterClasse) list = list.filter((p) => p.classe === filterClasse);
    if (filterSottoclasse) list = list.filter((p) => p.sottoclasse === filterSottoclasse);
    if (filterColore) list = list.filter((p) => p.colore === filterColore);
    return list.slice(0, 200);
  }, [sourceProducts, search, filterFamiglia, filterClasse, filterSottoclasse, filterColore]);

  const activeFilters = [filterFamiglia, filterClasse, filterSottoclasse, filterColore].filter(Boolean).length;

  function toggle(id: string) {
    setSelected((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }

  function handleConfirm() {
    const sel = allProducts.filter((p) => selected.has(p.id));
    const items: ItemParete[] = sel.map((p) => ({
      id: nanoid(8),
      tipo: tipoFromProduct(p, elementoTipo),
      productId: p.id,
      productCode: p.code,
      productName: formatProductName(p),
      imageUrl: productImageUrl(p),
      coloreHex: hexFromProduct(p),
      availableTaglie: availableTaglieFromProduct(p),
      pezzi: [],
    }));
    onAdd(items);
    onClose();
  }

  const isLoading = productsLoading || (sourceTab === 'carrello' && cartsLoading) || (sourceTab === 'ordine' && ordersLoading);

  const tabLabel = (t: SourceTab) => ({ tutti: 'Tutti', carrello: 'Carrello', ordine: 'Ordine' }[t]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white border border-gray-200 rounded-t-2xl sm:rounded-2xl flex flex-col max-h-[90vh] shadow-xl">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
          <PackagePlus size={16} className="text-gray-400 flex-shrink-0" />
          <p className="flex-1 text-sm font-medium text-gray-900">Aggiungi prodotto</p>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        {/* Source tabs */}
        <div className="flex px-4 pt-3 gap-1 flex-shrink-0">
          {(['tutti', 'carrello', 'ordine'] as SourceTab[]).map((t) => (
            <button key={t} type="button" onClick={() => setSourceTab(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${sourceTab === t ? 'bg-primary text-white' : 'text-gray-500 border border-gray-200 hover:bg-gray-50'}`}>
              {tabLabel(t)}
            </button>
          ))}
        </div>

        {/* Order selector */}
        {sourceTab === 'ordine' && (
          <div className="px-4 pt-2 flex-shrink-0">
            {ordersLoading ? (
              <div className="flex items-center gap-2 py-1"><Loader2 size={14} className="animate-spin text-gray-300" /><span className="text-xs text-gray-400">Carico ordini…</span></div>
            ) : orders.length === 0 ? (
              <p className="text-xs text-gray-400 py-1">Nessun ordine trovato</p>
            ) : (
              <select value={selectedOrderId} onChange={(e) => setSelectedOrderId(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-700 focus:outline-none focus:border-gray-400">
                <option value="">— Seleziona un ordine —</option>
                {orders.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.orderNumber ?? o.id.slice(0, 8)} · {o.items?.length ?? 0} prodotti
                    {o.destinazione?.nome ? ` · ${o.destinazione.nome}` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Search + filter toggle */}
        <div className="px-4 pt-3 pb-2 flex-shrink-0 space-y-2">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input autoFocus value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Cerca per nome…"
                className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:border-gray-400" />
            </div>
            <button type="button" onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-colors flex-shrink-0 ${showFilters || activeFilters > 0 ? 'bg-primary/10 border-primary/30 text-primary' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
              <SlidersHorizontal size={13} />
              Filtri{activeFilters > 0 ? ` (${activeFilters})` : ''}
              <ChevronDown size={11} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Expanded filters */}
          {showFilters && (
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Famiglia', value: filterFamiglia, opts: filterOptions.famiglie, set: setFilterFamiglia },
                { label: 'Colore', value: filterColore, opts: filterOptions.colori, set: setFilterColore },
                { label: 'Classe', value: filterClasse, opts: filterOptions.classi, set: setFilterClasse },
                { label: 'Sottoclasse', value: filterSottoclasse, opts: filterOptions.sottoclassi, set: setFilterSottoclasse },
              ].map(({ label, value, opts, set }) => (
                <select key={label} value={value} onChange={(e) => set(e.target.value)}
                  className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-700 focus:outline-none focus:border-gray-400">
                  <option value="">{label}…</option>
                  {opts.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              ))}
            </div>
          )}
        </div>

        {/* Product list */}
        <div className="overflow-y-auto flex-1 border-t border-gray-100">
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-gray-300" /></div>
          ) : sourceTab === 'ordine' && !selectedOrderId ? (
            <p className="text-center py-8 text-xs text-gray-400">Seleziona un ordine per visualizzare i prodotti</p>
          ) : filtered.length === 0 ? (
            <p className="text-center py-8 text-xs text-gray-400">Nessun risultato</p>
          ) : filtered.map((p) => {
            const isChecked = selected.has(p.id);
            const img = productImageUrl(p);
            return (
              <button key={p.id} onClick={() => toggle(p.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left ${isChecked ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${isChecked ? 'bg-primary border-primary' : 'border-gray-300'}`}>
                  {isChecked && <Check size={10} className="text-white" />}
                </div>
                {img
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={img} alt={p.name} className="w-9 h-9 object-cover rounded flex-shrink-0" />
                  : <div className="w-9 h-9 bg-gray-100 rounded flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-900 truncate">{formatProductName(p)}</p>
                  <p className="text-2xs text-gray-400">{[p.famiglia, p.colore].filter(Boolean).join(' · ')}</p>
                </div>
                <span className="text-2xs text-gray-400 flex-shrink-0 font-medium">{TIPO_LABELS[tipoFromProduct(p, elementoTipo)]}</span>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-100 flex items-center gap-3">
          <p className="flex-1 text-xs text-gray-400">
            {selected.size === 0 ? 'Nessun prodotto selezionato' : `${selected.size} prodott${selected.size === 1 ? 'o' : 'i'} selezionat${selected.size === 1 ? 'o' : 'i'}`}
          </p>
          <button onClick={onClose} className="px-3 py-2 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">Annulla</button>
          <button onClick={handleConfirm} disabled={selected.size === 0}
            className="px-4 py-2 bg-primary text-white text-xs font-medium rounded-lg disabled:opacity-40 hover:bg-primary/90 transition-colors">
            Aggiungi {selected.size > 0 ? `(${selected.size})` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Product picker (single, for re-linking) ─────────────────────────────────

function ProductPickerModal({ onSelect, onClose }: { onSelect: (p: Product) => void; onClose: () => void }) {
  const [search, setSearch] = useState('');
  const { data, isLoading } = useQuery<{ data: Product[] }>({
    queryKey: ['moda-products-visual'],
    queryFn: () => fetch(`/api/products?active=true&gruppoMerceologico=Moda&limit=500`).then((r) => r.json()),
    staleTime: 60_000,
  });
  const products = data?.data ?? [];
  const filtered = useMemo(() => {
    if (!search.trim()) return products.slice(0, 80);
    const q = search.toLowerCase();
    return products.filter((p) => formatProductName(p).toLowerCase().includes(q));
  }, [products, search]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white border border-gray-200 rounded-t-2xl sm:rounded-2xl flex flex-col max-h-[80vh] shadow-xl">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
          <p className="flex-1 text-sm font-medium text-gray-900">Seleziona prodotto PE27</p>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input autoFocus value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Cerca per nome…"
              className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:border-gray-400" />
          </div>
        </div>
        <div className="overflow-y-auto flex-1">
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-gray-300" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-center py-8 text-xs text-gray-400">Nessun risultato</p>
          ) : filtered.map((p) => {
            const img = productImageUrl(p);
            return (
              <button key={p.id} onClick={() => { onSelect(p); onClose(); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left">
                {img
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={img} alt={p.name} className="w-8 h-8 object-cover rounded flex-shrink-0" />
                  : <div className="w-8 h-8 bg-gray-100 rounded flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-900 truncate">{formatProductName(p)}</p>
                  <p className="text-2xs text-gray-400">{[p.famiglia, p.colore].filter(Boolean).join(' · ')}</p>
                </div>
              </button>
            );
          })}
        </div>
        <div className="px-4 py-3 border-t border-gray-100">
          <button onClick={onClose} className="w-full text-xs text-gray-400 hover:text-gray-600 transition-colors">
            Senza prodotto collegato — prosegui manualmente
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Item card ───────────────────────────────────────────────────────────────

function ItemCard({
  item, tipoOptions, onChange, onDelete, onMoveLeft, onMoveRight, canMoveLeft, canMoveRight,
}: {
  item: ItemParete; tipoOptions: TipoCapo[];
  onChange: (u: ItemParete) => void; onDelete: () => void;
  onMoveLeft?: () => void; onMoveRight?: () => void;
  canMoveLeft?: boolean; canMoveRight?: boolean;
}) {
  const [showPicker, setShowPicker] = useState(false);
  const [showSheet, setShowSheet] = useState(false);
  const color = item.coloreHex ?? colorForTipo(item.tipo);
  const harmony = item.coloreHex ? getColorHarmony(item.coloreHex) : null;
  const activeTaglie = new Set(item.pezzi.map((p) => p.taglia));
  const isAvailable = (t: string) => !item.availableTaglie?.length || item.availableTaglie.includes(t);

  function toggleTaglia(t: string) {
    if (!isAvailable(t)) return;
    onChange({ ...item, pezzi: activeTaglie.has(t) ? item.pezzi.filter((p) => p.taglia !== t) : [...item.pezzi, { taglia: t }] });
  }
  function addCustomTaglia(t: string) {
    if (!t.trim() || activeTaglie.has(t.toUpperCase())) return;
    onChange({ ...item, pezzi: [...item.pezzi, { taglia: t.toUpperCase() }] });
  }

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-1.5">
      {/* Row 1: tipo pills (left) + sizes + actions (right) */}
      <div className="flex items-start gap-2">
        <div className="w-1 self-stretch rounded-full flex-shrink-0 mt-0.5" style={{ backgroundColor: color, minHeight: 24 }} />
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-1 flex-wrap">
            <div className="flex gap-1 flex-wrap">
              {tipoOptions.map((t) => (
                <button key={t} type="button" onClick={() => onChange({ ...item, tipo: t })}
                  className={`px-2 py-0.5 rounded-full text-2xs font-medium transition-colors ${item.tipo === t ? 'bg-primary text-white' : 'text-gray-500 border border-gray-200 hover:border-gray-400'}`}>
                  {TIPO_LABELS[t]}
                </button>
              ))}
            </div>
            <div className="flex-1" />
            {/* size chips — top right */}
            <div className="flex items-center gap-0.5 flex-shrink-0">
              {TAGLIE_FULL.map((t) => {
                const avail = isAvailable(t);
                const active = activeTaglie.has(t);
                return (
                  <button key={t} type="button" onClick={() => toggleTaglia(t)}
                    disabled={!avail}
                    title={!avail ? 'Taglia non disponibile per questo prodotto' : undefined}
                    className={`px-1 py-0.5 rounded text-[9px] font-mono transition-colors ${
                      active
                        ? 'bg-primary text-white'
                        : avail
                          ? 'text-gray-500 border border-gray-200 hover:border-gray-400 hover:bg-white'
                          : 'text-gray-300 border border-gray-100 opacity-30 cursor-not-allowed'
                    }`}>
                    {t}
                  </button>
                );
              })}
              <CustomTagliaInput onAdd={addCustomTaglia} />
            </div>
            {/* action buttons */}
            <div className="flex gap-0.5 flex-shrink-0">
              {onMoveLeft && <button type="button" onClick={onMoveLeft} disabled={!canMoveLeft} className="w-5 h-5 flex items-center justify-center text-gray-300 hover:text-gray-600 disabled:opacity-20 transition-colors"><ChevronLeft size={12} /></button>}
              {onMoveRight && <button type="button" onClick={onMoveRight} disabled={!canMoveRight} className="w-5 h-5 flex items-center justify-center text-gray-300 hover:text-gray-600 disabled:opacity-20 transition-colors"><ChevronRight size={12} /></button>}
              <button type="button" onClick={onDelete} className="w-5 h-5 flex items-center justify-center text-gray-300 hover:text-red-500 transition-colors"><X size={12} /></button>
            </div>
          </div>

          {/* Row 2: product thumbnail + name (clickable → sheet) or link-to-catalog */}
          <div className="flex items-center gap-1.5">
            {item.imageUrl
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={item.imageUrl} alt="" className="w-5 h-5 object-cover rounded flex-shrink-0" />
              : <Tag size={10} className="text-gray-300 flex-shrink-0" />}
            {item.productName ? (
              <button type="button" onClick={() => setShowSheet(true)}
                className="flex-1 text-2xs text-gray-600 hover:text-primary hover:underline transition-colors text-left truncate">
                {item.productName}
              </button>
            ) : (
              <button type="button" onClick={() => setShowPicker(true)}
                className="flex-1 text-2xs text-gray-400 hover:text-gray-600 transition-colors text-left">
                Collega prodotto dal catalogo
              </button>
            )}
            <div className="flex gap-1 flex-shrink-0 ml-auto">
              {item.productName && (
                <button type="button" onClick={() => setShowPicker(true)}
                  title="Cambia prodotto"
                  className="text-gray-300 hover:text-gray-500 transition-colors">
                  <Edit2 size={10} />
                </button>
              )}
              {item.pezzi.length > 0 && <span className="text-2xs text-gray-300">{item.pezzi.length} pz</span>}
            </div>
          </div>

          {/* Row 3: color harmony */}
          {harmony && (
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full border border-white/50 shadow-sm flex-shrink-0"
                style={{ backgroundColor: color }} title="Colore prodotto" />
              <span className="text-[9px] text-gray-300 flex-shrink-0">→</span>
              {harmony.map((c, i) => (
                <div key={i} className="w-2.5 h-2.5 rounded-full flex-shrink-0 border border-white/20"
                  style={{ backgroundColor: c, opacity: 0.75 }}
                  title={['Complementare', 'Analogo +30°', 'Analogo −30°'][i]} />
              ))}
              <a href="/moda/ruota-cromatica"
                className="text-[9px] text-gray-300 hover:text-primary transition-colors ml-0.5 flex-shrink-0"
                title="Apri ruota cromatica PE27">
                ruota cromatica →
              </a>
            </div>
          )}
        </div>
      </div>

      {showPicker && (
        <ProductPickerModal
          onSelect={(p) => onChange({
            ...item,
            productId: p.id, productCode: p.code, productName: formatProductName(p),
            imageUrl: productImageUrl(p),
            coloreHex: hexFromProduct(p) ?? item.coloreHex,
            availableTaglie: availableTaglieFromProduct(p),
          })}
          onClose={() => setShowPicker(false)}
        />
      )}
      {showSheet && item.productId && (
        <ProductSheetModal item={item} onClose={() => setShowSheet(false)} />
      )}
    </div>
  );
}

function CustomTagliaInput({ onAdd }: { onAdd: (t: string) => void }) {
  const [value, setValue] = useState('');
  const [editing, setEditing] = useState(false);
  if (!editing) return (
    <button type="button" onClick={() => setEditing(true)}
      className="px-1.5 py-0.5 rounded text-[9px] text-gray-400 border border-dashed border-gray-300 hover:border-gray-500 transition-colors">
      +
    </button>
  );
  return (
    <input autoFocus value={value} onChange={(e) => setValue(e.target.value.toUpperCase())}
      onKeyDown={(e) => { if (e.key === 'Enter') { onAdd(value); setValue(''); setEditing(false); } if (e.key === 'Escape') { setValue(''); setEditing(false); } }}
      onBlur={() => { if (value) onAdd(value); setValue(''); setEditing(false); }}
      placeholder="44…" className="w-10 px-1 py-0.5 rounded text-[9px] font-mono text-gray-900 bg-white border border-gray-300 focus:outline-none" />
  );
}

// ─── Single-item frontale editor (inline) ────────────────────────────────────

function FrontaleInlineEditor({
  label, item, onChange, onRemove,
}: {
  label: string; item?: ItemParete;
  onChange: (it: ItemParete) => void; onRemove: () => void;
}) {
  const [showPicker, setShowPicker] = useState(false);

  if (!item) {
    return (
      <button type="button" onClick={() => onChange({ id: nanoid(8), tipo: 'abito', pezzi: [] })}
        className="flex-1 py-2 border border-dashed border-gray-200 rounded-xl text-xs text-gray-400 hover:border-gray-400 hover:text-gray-600 transition-colors flex items-center justify-center gap-1.5">
        <Plus size={12} /> {label}
      </button>
    );
  }

  const activeTaglie = new Set(item.pezzi.map((p) => p.taglia));
  const isAvailable = (t: string) => !item.availableTaglie?.length || item.availableTaglie.includes(t);

  return (
    <div className="flex-1 bg-gray-50 border border-gray-200 rounded-xl p-2.5 space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-7 rounded-sm flex-shrink-0" style={{ backgroundColor: item.coloreHex ?? colorForTipo(item.tipo) }} />
          <div>
            <p className="text-2xs font-medium text-gray-600">{label}</p>
            <div className="flex gap-0.5 flex-wrap mt-0.5">
              {TIPO_OPTIONS_FRONTALE.slice(0, 4).map((t) => (
                <button key={t} type="button" onClick={() => onChange({ ...item, tipo: t })}
                  className={`px-1.5 py-0 rounded-full text-2xs transition-colors ${item.tipo === t ? 'bg-primary text-white' : 'text-gray-400 border border-gray-200 hover:border-gray-400'}`}
                  style={{ fontSize: 9 }}>
                  {TIPO_LABELS[t]}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <button type="button" onClick={() => setShowPicker(true)} className="text-gray-300 hover:text-gray-600 transition-colors" title="Collega prodotto"><Tag size={12} /></button>
          <button type="button" onClick={onRemove} className="text-gray-300 hover:text-red-500 transition-colors"><X size={12} /></button>
        </div>
      </div>
      <div className="flex flex-wrap gap-0.5">
        {TAGLIE_FULL.map((t) => {
          const avail = isAvailable(t);
          const active = activeTaglie.has(t);
          return (
            <button key={t} type="button"
              onClick={() => {
                if (!avail) return;
                onChange({ ...item, pezzi: active ? item.pezzi.filter((p) => p.taglia !== t) : [...item.pezzi, { taglia: t }] });
              }}
              disabled={!avail}
              className={`px-1 py-0 rounded text-[9px] font-mono transition-colors ${active ? 'bg-primary text-white' : avail ? 'text-gray-400 border border-gray-200 hover:border-gray-400' : 'text-gray-200 border border-gray-100 opacity-30 cursor-not-allowed'}`}>
              {t}
            </button>
          );
        })}
      </div>
      {item.productName && (
        <p className="text-2xs text-gray-400 truncate">{item.productName}</p>
      )}
      {showPicker && (
        <ProductPickerModal
          onSelect={(p) => onChange({
            ...item, productId: p.id, productCode: p.code, productName: formatProductName(p),
            imageUrl: productImageUrl(p),
            coloreHex: hexFromProduct(p) ?? item.coloreHex,
            availableTaglie: availableTaglieFromProduct(p),
          })}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}

// ─── Mensola inline editor ───────────────────────────────────────────────────

function MensolaInlineEditor({
  config, onChange, onRemove,
}: {
  config?: MensolaInlineConfig; onChange: (c: MensolaInlineConfig) => void; onRemove: () => void;
}) {
  const [showCatalog, setShowCatalog] = useState(false);

  if (!config) {
    return (
      <button type="button"
        onClick={() => onChange({ dimensione: 'media', items: [] })}
        className="w-full py-1.5 border border-dashed border-gray-300 rounded-lg text-2xs text-gray-500 hover:bg-gray-50 transition-colors flex items-center justify-center gap-1">
        <Plus size={11} /> Mensola sopra
      </button>
    );
  }

  function updateItem(idx: number, updated: ItemParete) {
    const items = [...config!.items]; items[idx] = updated; onChange({ ...config!, items });
  }
  function removeItem(idx: number) { onChange({ ...config!, items: config!.items.filter((_, i) => i !== idx) }); }
  function addFromCatalog(newItems: ItemParete[]) { onChange({ ...config!, items: [...config!.items, ...newItems] }); }

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="w-2 h-2 rounded-full bg-gray-400 flex-shrink-0" />
        <p className="text-xs font-medium text-gray-700">Mensola</p>
        <div className="flex gap-1">
          {MENSOLA_DIMS.map((d) => (
            <button key={d} type="button" onClick={() => onChange({ ...config, dimensione: d })}
              className={`px-2 py-0.5 text-2xs rounded-full transition-colors ${config.dimensione === d ? 'bg-primary text-white' : 'text-gray-500 border border-gray-200 hover:bg-gray-100'}`}>
              {d}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {(['sopra', 'sotto', 'fianco'] as PosizioneMensola[]).map((p) => (
            <button key={p} type="button" onClick={() => onChange({ ...config, posizione: p })}
              className={`px-2 py-0.5 text-2xs rounded-full transition-colors ${(config.posizione ?? 'sopra') === p ? 'bg-gray-700 text-white' : 'text-gray-500 border border-gray-200 hover:bg-gray-100'}`}>
              {p}
            </button>
          ))}
        </div>
        <div className="flex gap-0.5 ml-auto">
          <button type="button" onClick={() => onChange({ ...config, offsetX: Math.max(0, (config.offsetX ?? 0) - COSTA_W) })}
            className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-600 disabled:opacity-20 transition-colors"
            disabled={(config.offsetX ?? 0) === 0}><ChevronLeft size={11} /></button>
          <button type="button" onClick={() => onChange({ ...config, offsetX: (config.offsetX ?? 0) + COSTA_W })}
            className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"><ChevronRight size={11} /></button>
        </div>
        <button type="button" onClick={onRemove} className="text-gray-300 hover:text-red-400 transition-colors"><X size={13} /></button>
      </div>
      {config.items.map((it, idx) => (
        <ItemCard key={it.id} item={it} tipoOptions={TIPO_OPTIONS_MENSOLA}
          onChange={(u) => updateItem(idx, u)} onDelete={() => removeItem(idx)}
          onMoveLeft={() => { const a = [...config.items]; [a[idx], a[idx - 1]] = [a[idx - 1], a[idx]]; onChange({ ...config, items: a }); }}
          onMoveRight={() => { const a = [...config.items]; [a[idx], a[idx + 1]] = [a[idx + 1], a[idx]]; onChange({ ...config, items: a }); }}
          canMoveLeft={idx > 0} canMoveRight={idx < config.items.length - 1} />
      ))}
      <button type="button" onClick={() => setShowCatalog(true)}
        className="w-full py-1.5 bg-white border border-gray-200 rounded-lg text-2xs text-gray-600 hover:bg-gray-50 transition-colors flex items-center justify-center gap-1 font-medium">
        <PackagePlus size={11} /> Aggiungi prodotto
      </button>
      {showCatalog && <AddProductModal elementoTipo="mensola" onAdd={addFromCatalog} onClose={() => setShowCatalog(false)} />}
    </div>
  );
}

// ─── Elemento card ────────────────────────────────────────────────────────────

function ElementoCard({
  el, index, total, isActive, onChange, onDelete, onMoveUp, onMoveDown,
}: {
  el: ElementoParete; index: number; total: number; isActive?: boolean;
  onChange: (u: ElementoParete) => void; onDelete: () => void;
  onMoveUp: () => void; onMoveDown: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showCatalogPicker, setShowCatalogPicker] = useState(false);

  useEffect(() => { if (isActive) setExpanded(true); }, [isActive]);

  const isBarra = el.tipo === 'barra';
  const isMensola = el.tipo === 'mensola';
  const isFrontale = el.tipo === 'frontale';
  const tipoOptions = isBarra ? TIPO_OPTIONS_BARRA : isMensola ? TIPO_OPTIONS_MENSOLA : TIPO_OPTIONS_FRONTALE;
  const barraDim = (el.dimensione ?? 'media') as DimensioneBarra;
  const maxPz = isBarra ? BARRA_MAX_PZ[barraDim] : null;
  const pzCount = isBarra ? totalePezzi(el.items) : null;
  const pzOver = maxPz !== null && pzCount !== null && pzCount > maxPz;

  function addFromCatalog(items: ItemParete[]) { onChange({ ...el, items: [...el.items, ...items] }); }
  function updateItem(idx: number, updated: ItemParete) { const a = [...el.items]; a[idx] = updated; onChange({ ...el, items: a }); }
  function removeItem(idx: number) { onChange({ ...el, items: el.items.filter((_, i) => i !== idx) }); }
  function moveItem(from: number, to: number) {
    if (to < 0 || to >= el.items.length) return;
    const a = [...el.items]; [a[from], a[to]] = [a[to], a[from]]; onChange({ ...el, items: a });
  }
  function applySuggerimento() {
    const pezziDefault = [{ taglia: 'S' }, { taglia: 'M' }, { taglia: 'L' }, { taglia: 'XL' }];
    onChange({ ...el, items: BARRA_PATTERN[barraDim].map((tipo) => ({ id: nanoid(8), tipo, pezzi: pezziDefault })) });
  }

  const elLabel = isBarra ? 'Barra' : isMensola ? 'Mensola' : 'Frontale';
  const totalPz = totalePezzi(el.items);

  return (
    <div id={`card-${el.id}`} className={`border rounded-2xl overflow-hidden bg-white shadow-sm transition-colors ${isActive ? 'border-primary/40' : 'border-gray-200'}`}>
      <div className="flex items-center gap-2 px-4 py-3 bg-gray-50">
        <div className="flex gap-0.5">
          <button type="button" onClick={onMoveUp} disabled={index === 0} className="text-gray-300 hover:text-gray-600 disabled:opacity-20 transition-colors"><ChevronLeft size={14} /></button>
          <button type="button" onClick={onMoveDown} disabled={index === total - 1} className="text-gray-300 hover:text-gray-600 disabled:opacity-20 transition-colors"><ChevronRight size={14} /></button>
        </div>
        <button type="button" onClick={() => setExpanded(!expanded)} className="flex items-center gap-2 flex-1 min-w-0 text-left">
          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-gray-900 text-white flex-shrink-0">{elLabel}</span>
          <p className={`text-xs ${pzOver ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
            {el.items.length} capi{totalPz > 0 && ` · ${totalPz} pz`}{maxPz !== null && ` / max ${maxPz} pz`}{pzOver && ' — LIMITE SUPERATO'}
          </p>
        </button>
        {isBarra && (
          <div className="flex gap-1 flex-shrink-0">
            {BARRA_DIMS.map((d) => (
              <button key={d} type="button" onClick={() => onChange({ ...el, dimensione: d })}
                className={`px-2 py-0.5 text-2xs rounded-full transition-colors ${barraDim === d ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'text-gray-400 border border-gray-200 hover:border-gray-400'}`}>
                {d}
              </button>
            ))}
          </div>
        )}
        {isMensola && (
          <div className="flex gap-1 flex-shrink-0">
            {MENSOLA_DIMS.map((d) => (
              <button key={d} type="button" onClick={() => onChange({ ...el, dimensione: d })}
                className={`px-2 py-0.5 text-2xs rounded-full transition-colors ${el.dimensione === d ? 'bg-gray-200 text-gray-700 border border-gray-300' : 'text-gray-400 border border-gray-200 hover:border-gray-400'}`}>
                {d}
              </button>
            ))}
          </div>
        )}
        {pzOver && <AlertTriangle size={14} className="text-red-500 flex-shrink-0" />}
        <button type="button" onClick={onDelete} className="text-gray-300 hover:text-red-500 transition-colors ml-1 flex-shrink-0"><Trash2 size={14} /></button>
      </div>

      {expanded && (
        <div className="px-4 py-3 space-y-3">
          {(isBarra || isFrontale) && (
            <MensolaInlineEditor
              config={el.mensolaTop}
              onChange={(c) => onChange({ ...el, mensolaTop: c })}
              onRemove={() => onChange({ ...el, mensolaTop: undefined })}
            />
          )}
          <div className="space-y-2">
            {el.items.map((item, idx) => (
              <ItemCard key={item.id} item={item} tipoOptions={tipoOptions}
                onChange={(u) => updateItem(idx, u)} onDelete={() => removeItem(idx)}
                onMoveLeft={!isFrontale ? () => moveItem(idx, idx - 1) : undefined}
                onMoveRight={!isFrontale ? () => moveItem(idx, idx + 1) : undefined}
                canMoveLeft={idx > 0} canMoveRight={idx < el.items.length - 1} />
            ))}
            {(!isFrontale ? true : el.items.length < 2) && (
              <button type="button" onClick={() => setShowCatalogPicker(true)}
                className="w-full py-2 bg-primary/5 border border-primary/20 rounded-xl text-xs text-primary hover:bg-primary/10 transition-colors flex items-center justify-center gap-1.5 font-medium">
                <PackagePlus size={13} />
                {isFrontale && el.items.length === 1 ? 'Aggiungi secondo capo' : 'Aggiungi prodotto'}
              </button>
            )}
            {isBarra && (
              <button type="button" onClick={applySuggerimento}
                className="w-full py-1.5 border border-dashed border-gray-200 rounded-xl text-2xs text-gray-400 hover:text-gray-600 hover:border-gray-400 transition-colors flex items-center justify-center gap-1">
                <span className="font-mono">{BARRA_PATTERN[barraDim].map((t) => t === 'top' ? 'T' : 'B').join('·')}</span>
                <span className="ml-1">— Riempi pattern suggerito ({BARRA_PATTERN[barraDim].length}×4pz)</span>
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
            <p className="text-2xs text-gray-400 flex-1">Posizione orizzontale</p>
            <button type="button" onClick={() => onChange({ ...el, offsetX: Math.max(0, (el.offsetX ?? 0) - COSTA_W) })}
              disabled={(el.offsetX ?? 0) === 0}
              className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-gray-600 disabled:opacity-20 transition-colors">
              <ChevronLeft size={14} />
            </button>
            {(el.offsetX ?? 0) > 0 && (
              <span className="text-2xs text-gray-400 font-mono min-w-[28px] text-center">+{el.offsetX}px</span>
            )}
            <button type="button" onClick={() => onChange({ ...el, offsetX: (el.offsetX ?? 0) + COSTA_W })}
              className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-gray-600 transition-colors">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
      {showCatalogPicker && (
        <AddProductModal elementoTipo={el.tipo} onAdd={addFromCatalog} onClose={() => setShowCatalogPicker(false)} />
      )}
    </div>
  );
}

// ─── Wall renderer ────────────────────────────────────────────────────────────

function WallRenderer({
  config, onReorder, onSelect, zoom,
}: {
  config: ElementoParete[];
  onReorder: (c: ElementoParete[]) => void;
  onSelect?: (id: string) => void;
  zoom?: number;
}) {
  const draggingIdRef = useRef<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);

  if (config.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-300 p-4">
        <p className="text-xs text-center">Aggiungi barre, mensole o frontali</p>
      </div>
    );
  }

  function handleDrop(e: React.DragEvent, targetIdx: number) {
    e.preventDefault();
    e.stopPropagation();
    const srcId = e.dataTransfer.getData('text/plain');
    const srcIdx = config.findIndex((x) => x.id === srcId);
    if (srcIdx !== -1 && srcIdx !== targetIdx) {
      const next = [...config];
      [next[srcIdx], next[targetIdx]] = [next[targetIdx], next[srcIdx]];
      onReorder(next);
    }
    draggingIdRef.current = null;
    setDraggingId(null);
    setOverIdx(null);
  }

  return (
    <div className="px-4 py-3 h-full">
      <div className="flex items-end gap-4 h-full" style={zoom !== undefined ? { zoom } : undefined}>
        {config.map((el, idx) => (
          <div
            key={el.id}
            draggable
            onClick={(e) => { e.stopPropagation(); onSelect?.(el.id); }}
            onDragStart={(e) => {
              draggingIdRef.current = el.id;
              setDraggingId(el.id);
              e.dataTransfer.setData('text/plain', el.id);
              e.dataTransfer.effectAllowed = 'move';
            }}
            onDragOver={(e) => {
              e.preventDefault();
              const did = draggingIdRef.current;
              if (did && did !== el.id) setOverIdx(idx);
            }}
            onDrop={(e) => handleDrop(e, idx)}
            onDragEnd={() => { draggingIdRef.current = null; setDraggingId(null); setOverIdx(null); }}
            className={[
              'cursor-grab active:cursor-grabbing select-none flex-shrink-0 transition-opacity',
              draggingId === el.id ? 'opacity-30' : 'opacity-100',
              overIdx === idx && draggingId !== el.id ? 'outline outline-2 outline-primary outline-offset-2 rounded' : '',
            ].join(' ')}
          >
            <WallElementRenderer el={el} />
          </div>
        ))}
      </div>
    </div>
  );
}

function MensolaBlock({ config }: { config: MensolaInlineConfig }) {
  return <div style={{ marginLeft: config.offsetX ?? 0 }}><MensolaRenderer config={config} /></div>;
}

function WallElementRenderer({ el }: { el: ElementoParete }) {
  const pos = el.mensolaTop?.posizione ?? 'sopra';

  if (el.tipo === 'barra') {
    const dim = (el.dimensione ?? 'media') as DimensioneBarra;
    const pzTot = totalePezzi(el.items);
    const over = pzTot > BARRA_MAX_PZ[dim];
    const barraCore = (
      <div style={{ marginLeft: el.offsetX ?? 0 }}>
        <div className={`h-0.5 rounded ${over ? 'bg-red-400' : 'bg-gray-400'}`} style={{ minWidth: UNIT }} />
        <div className="flex items-start" style={{ gap: 1, minHeight: 48, minWidth: UNIT }}>
          {el.items.length === 0
            ? <div style={{ minWidth: UNIT }} />
            : el.items.map((it, i) => <CapoOnBarra key={it.id ?? i} item={it} />)}
        </div>
        {/* Photo strip — each photo aligned under its item's slot */}
        {el.items.some((it) => it.imageUrl) && (
          <div className="flex mt-1" style={{ gap: 1 }}>
            {el.items.map((it, i) => {
              const count = Math.max(1, it.pezzi.length);
              const slotW = count * COSTA_W + Math.max(0, count - 1);
              return it.imageUrl
                ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={it.id ?? i} src={it.imageUrl} alt=""
                    className="flex-shrink-0 object-contain"
                    style={{ width: slotW, height: 36 }} />
                )
                : <div key={it.id ?? i} className="flex-shrink-0" style={{ width: slotW, height: 36 }} />;
            })}
          </div>
        )}
      </div>
    );
    if (!el.mensolaTop) return <div className="flex-shrink-0">{barraCore}</div>;
    if (pos === 'sopra') return (
      <div className="flex flex-col items-start flex-shrink-0">
        <MensolaBlock config={el.mensolaTop} />
        <div style={{ marginTop: 12 }}>{barraCore}</div>
      </div>
    );
    if (pos === 'sotto') return (
      <div className="flex flex-col items-start flex-shrink-0">
        {barraCore}
        <div style={{ marginTop: 12 }}><MensolaBlock config={el.mensolaTop} /></div>
      </div>
    );
    return <div className="flex items-center gap-2 flex-shrink-0">{barraCore}<MensolaBlock config={el.mensolaTop} /></div>;
  }

  if (el.tipo === 'mensola') {
    return (
      <div className="flex-shrink-0" style={{ marginLeft: el.offsetX ?? 0 }}>
        <MensolaRenderer config={{ dimensione: (el.dimensione as DimensioneMensola) ?? 'media', items: el.items, posizione: 'sopra' }} />
      </div>
    );
  }

  if (el.tipo === 'frontale') {
    const item1 = el.items[0];
    const item2 = el.items[1];

    const frontaleCore = item2 ? (
      <div style={{ width: FRONTALE_W }}>
        {item1?.imageUrl
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={item1.imageUrl} alt="" className="rounded-t border border-b-0 border-gray-200 object-cover" style={{ width: FRONTALE_W, height: FRONTALE_TOP_H }} />
          : <div className="rounded-t border border-b-0 border-gray-200" style={{ backgroundColor: item1?.coloreHex ?? '#e5e7eb', width: FRONTALE_W, height: FRONTALE_TOP_H }} />}
        {item2.imageUrl
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={item2.imageUrl} alt="" className="rounded-b border border-gray-200 object-cover" style={{ width: FRONTALE_W, height: FRONTALE_BOT_H }} />
          : <div className="rounded-b border border-gray-200" style={{ backgroundColor: item2.coloreHex ?? '#e5e7eb', width: FRONTALE_W, height: FRONTALE_BOT_H }} />}
      </div>
    ) : item1?.imageUrl ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={item1.imageUrl} alt="" className="rounded border border-gray-200 object-cover" style={{ width: FRONTALE_W, height: FRONTALE_H }} />
    ) : (
      <div className="rounded border border-gray-200" style={{ backgroundColor: item1?.coloreHex ?? '#e5e7eb', width: FRONTALE_W, height: FRONTALE_H }} />
    );

    const wrapper = (children: React.ReactNode) => (
      <div className="flex-shrink-0" style={{ marginLeft: el.offsetX ?? 0 }}>{children}</div>
    );
    if (!el.mensolaTop) return wrapper(frontaleCore);
    if (pos === 'sopra') return wrapper(<div className="flex flex-col items-start"><MensolaBlock config={el.mensolaTop} /><div style={{ marginTop: 12 }}>{frontaleCore}</div></div>);
    if (pos === 'sotto') return wrapper(<div className="flex flex-col items-start">{frontaleCore}<div style={{ marginTop: 12 }}><MensolaBlock config={el.mensolaTop} /></div></div>);
    return wrapper(<div className="flex items-center gap-2">{frontaleCore}<MensolaBlock config={el.mensolaTop} /></div>);
  }

  return null;
}

function MensolaRenderer({ config }: { config: MensolaInlineConfig }) {
  const w = MENSOLA_W[config.dimensione];
  const hasPhotos = config.items.some((it) => it.imageUrl);

  // Width of each item on the shelf (for photo alignment)
  function itemW(it: ItemParete) { return it.tipo === 'accessorio' ? 29 : 48; }

  return (
    <div>
      {/* Photos above — aligned with each item */}
      {hasPhotos && (
        <div className="flex items-end gap-0.5 mb-1">
          {config.items.map((it, i) => {
            const w2 = itemW(it);
            return it.imageUrl
              ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={it.id ?? i} src={it.imageUrl} alt="" className="flex-shrink-0 object-contain rounded-sm" style={{ width: w2, height: 30 }} />
              )
              : <div key={it.id ?? i} className="flex-shrink-0" style={{ width: w2, height: 30 }} />;
          })}
        </div>
      )}
      {/* Shelf items — color blocks */}
      <div className="flex items-end gap-0.5" style={{ minWidth: w }}>
        {config.items.length === 0
          ? <div style={{ width: w, height: STRATO_H }} />
          : config.items.map((it, i) => {
              const color = it.coloreHex ?? colorForTipo(it.tipo);
              if (it.tipo === 'borsa') {
                return <div key={it.id ?? i} className="flex-shrink-0 rounded-sm" style={{ backgroundColor: color, width: 48, height: 42 }} title={`Borsa (${it.pezzi.length}pz)`} />;
              }
              if (it.tipo === 'accessorio') {
                return <div key={it.id ?? i} className="flex-shrink-0 rounded-sm" style={{ backgroundColor: color, width: 29, height: 26 }} title={`Accessorio (${it.pezzi.length}pz)`} />;
              }
              const n = Math.max(1, it.pezzi.length);
              return (
                <div key={it.id ?? i} className="flex flex-col-reverse flex-shrink-0" style={{ width: 48 }}
                  title={`${TIPO_LABELS[it.tipo]} · ${n} strat${n === 1 ? 'o' : 'i'}`}>
                  {Array.from({ length: n }).map((_, j) => (
                    <div key={j} style={{ backgroundColor: color, height: STRATO_H, width: '100%' }} />
                  ))}
                </div>
              );
            })}
      </div>
      <div className="h-0.5 bg-gray-400 rounded" style={{ width: w }} />
    </div>
  );
}

function CapoOnBarra({ item }: { item: ItemParete }) {
  const color = item.coloreHex ?? colorForTipo(item.tipo);
  const h = item.tipo === 'abito' ? 96 : item.tipo === 'capospalla' ? 80 : 64;
  const count = Math.max(1, item.pezzi.length);
  return (
    <div className="flex flex-shrink-0" style={{ gap: 1 }}
      title={`${TIPO_LABELS[item.tipo]}${item.productName ? ` — ${item.productName}` : ''} · ${item.pezzi.length}pz`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col items-center" style={{ width: COSTA_W }}>
          <div className="w-1 h-1.5 bg-gray-400 rounded-full" />
          <div className="rounded-sm" style={{ backgroundColor: color, width: COSTA_W - 2, height: h }} />
        </div>
      ))}
    </div>
  );
}

// ─── Main editor ──────────────────────────────────────────────────────────────

export default function ModaPareteEditor({ pareteId }: { pareteId: string }) {
  const router = useRouter();
  const qc = useQueryClient();

  const { data, isLoading, isError } = useQuery<{ data: PareteAttrezzata }>({
    queryKey: ['moda-parete', pareteId],
    queryFn: () => fetch(`/api/moda/pareti/${pareteId}`).then((r) => r.json()),
    staleTime: 30_000,
  });

  const parete = data?.data;
  const [nome, setNome] = useState('');
  const [editingNome, setEditingNome] = useState(false);
  const [config, setConfig] = useState<ElementoParete[]>([]);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [activeElementId, setActiveElementId] = useState<string | null>(null);
  const [previewZoom, setPreviewZoom] = useState(1);
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (parete && !initializedRef.current) {
      initializedRef.current = true;
      setNome(parete.nome);
      setConfig(Array.isArray(parete.configurazione) ? parete.configurazione as ElementoParete[] : []);
    }
  }, [parete]);

  const saveConfig = useCallback(async (newConfig: ElementoParete[], newNome?: string) => {
    setSaveStatus('saving');
    try {
      const body: Record<string, unknown> = { configurazione: newConfig };
      if (newNome !== undefined) body.nome = newNome;
      const res = await fetch(`/api/moda/pareti/${pareteId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      setSaveStatus('saved');
      qc.invalidateQueries({ queryKey: ['moda-pareti'] });
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
      toast.error('Errore nel salvataggio');
      setSaveStatus('idle');
    }
  }, [pareteId, qc]);

  function handleConfigChange(newConfig: ElementoParete[]) {
    setConfig(newConfig);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaveStatus('saving');
    saveTimerRef.current = setTimeout(() => saveConfig(newConfig), 1200);
  }

  function handleNomeSave() {
    setEditingNome(false);
    if (nome.trim() && nome !== parete?.nome) saveConfig(config, nome.trim());
  }

  function addElemento(tipo: TipoElementoParete) {
    const newEl: ElementoParete = {
      id: nanoid(8), tipo,
      dimensione: tipo === 'mensola' ? 'media' : tipo === 'barra' ? 'media' : undefined,
      items: [],
    };
    handleConfigChange([...config, newEl]);
  }

  function updateElemento(idx: number, updated: ElementoParete) {
    const next = [...config]; next[idx] = updated; handleConfigChange(next);
  }
  function deleteElemento(idx: number) { handleConfigChange(config.filter((_, i) => i !== idx)); }
  function moveElemento(from: number, to: number) {
    if (to < 0 || to >= config.length) return;
    const next = [...config];
    [next[from], next[to]] = [next[to], next[from]];
    handleConfigChange(next);
  }

  function handleSelectElement(id: string) {
    setActiveElementId(id);
    setTimeout(() => {
      document.getElementById(`card-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 60);
  }

  const totalCapi = config.reduce((acc, el) => acc + el.items.length, 0);
  const totalPz = config.reduce((acc, el) => acc + totalePezzi(el.items), 0);

  if (isLoading) return <div className="h-full bg-gray-50 flex items-center justify-center"><Loader2 size={24} className="animate-spin text-gray-300" /></div>;
  if (isError || !parete) return <div className="h-full bg-gray-50 flex items-center justify-center"><p className="text-sm text-gray-400">Layout non trovato</p></div>;

  return (
    // h-full fills <main>, flex-col: header + preview (fixed) + cards (own scroll)
    <div className="flex flex-col h-full overflow-hidden bg-gray-50 text-gray-900">
      {/* Header — always visible, never scrolls */}
      <div className="flex-shrink-0 bg-gray-50/95 backdrop-blur border-b border-gray-100 px-4 py-3 z-20">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <button onClick={() => router.push('/moda/pareti')} className="text-gray-400 hover:text-gray-700 transition-colors"><ArrowLeft size={20} /></button>
          <div className="flex-1 min-w-0">
            {editingNome ? (
              <input autoFocus value={nome} onChange={(e) => setNome(e.target.value)}
                onBlur={handleNomeSave}
                onKeyDown={(e) => { if (e.key === 'Enter') handleNomeSave(); if (e.key === 'Escape') { setNome(parete.nome); setEditingNome(false); } }}
                className="bg-transparent border-b border-gray-400 text-base font-semibold text-gray-900 focus:outline-none w-full" />
            ) : (
              <button type="button" onClick={() => setEditingNome(true)} className="flex items-center gap-1.5 group">
                <h1 className="text-base font-semibold truncate text-gray-900">{nome}</h1>
                <Edit2 size={12} className="text-gray-300 group-hover:text-gray-500 transition-colors flex-shrink-0" />
              </button>
            )}
            <p className="text-xs text-gray-400">{config.length} elementi · {totalCapi} capi · {totalPz} pz</p>
          </div>
          <div className="flex-shrink-0">
            {saveStatus === 'saving' && <Loader2 size={14} className="animate-spin text-gray-400" />}
            {saveStatus === 'saved' && <Check size={14} className="text-emerald-500" />}
          </div>
        </div>
      </div>

      {/* Preview panel — always visible, never scrolls */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 shadow-sm z-10">
        <div style={{ height: '40vh' }} className="flex flex-col">
          <div className="flex items-center gap-2 px-4 py-2 flex-shrink-0">
            <p className="text-2xs text-gray-400 uppercase tracking-widest flex-1">Anteprima parete</p>
            <p className="text-2xs text-gray-300 hidden sm:block">Trascina ·</p>
            <button type="button" onClick={() => setPreviewZoom((z) => Math.max(0.4, +(z - 0.15).toFixed(2)))}
              className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors">
              <ZoomOut size={13} />
            </button>
            <span className="text-2xs text-gray-400 font-mono w-8 text-center">{Math.round(previewZoom * 100)}%</span>
            <button type="button" onClick={() => setPreviewZoom((z) => Math.min(2, +(z + 0.15).toFixed(2)))}
              className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors">
              <ZoomIn size={13} />
            </button>
            <div className="w-px h-4 bg-gray-200 mx-1" />
            {(['barra', 'mensola', 'frontale'] as const).map((tipo) => (
              <button key={tipo} type="button" onClick={() => addElemento(tipo)}
                className="flex items-center gap-1 px-2.5 py-1 bg-cream text-primary border border-border rounded-lg text-2xs font-medium hover:bg-accent/10 transition-colors">
                <Plus size={11} /> {tipo.charAt(0).toUpperCase() + tipo.slice(1)}
              </button>
            ))}
          </div>
          <div className="flex-1 min-h-0 border-t border-gray-100 overflow-x-auto overflow-y-hidden">
            <WallRenderer
              config={config}
              onReorder={handleConfigChange}
              onSelect={handleSelectElement}
              zoom={previewZoom}
            />
          </div>
        </div>
      </div>

      {/* Editor cards — own scroll, only this section moves */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto w-full px-4 py-4 pb-24 space-y-3">
          {config.map((el, idx) => (
            <ElementoCard
              key={el.id}
              el={el}
              index={idx}
              total={config.length}
              isActive={activeElementId === el.id}
              onChange={(u) => updateElemento(idx, u)}
              onDelete={() => deleteElemento(idx)}
              onMoveUp={() => moveElemento(idx, idx - 1)}
              onMoveDown={() => moveElemento(idx, idx + 1)}
            />
          ))}
          {config.length === 0 && (
            <div className="py-10 text-center">
              <p className="text-sm text-gray-400">Costruisci il tuo layout</p>
              <p className="text-xs mt-1 text-gray-300">Aggiungi barre appenderia, mensole ed esposizioni frontali usando i pulsanti in cima</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
