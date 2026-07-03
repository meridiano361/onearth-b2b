'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Plus, X, Search, Loader2, ChevronLeft, ChevronRight,
  Trash2, Edit2, Check, Tag, PackagePlus, AlertTriangle, ZoomIn, ZoomOut,
  SlidersHorizontal, ChevronDown, ChevronUp, GripVertical, Undo2, Redo2,
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
// Frontale: slot 1 = abito | top | capospalla; slot 2 (solo se slot1 è top/capospalla) = bottom
const TIPO_OPTIONS_FRONTALE_SLOT1: TipoCapo[] = ['abito', 'top', 'capospalla'];
const TIPO_OPTIONS_FRONTALE_SLOT2: TipoCapo[] = ['bottom'];

const TAGLIE_FULL = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'TU'];

const BARRA_MAX_PZ: Record<DimensioneBarra, number> = { piccola: 24, media: 36, grande: 48 };
const BARRA_W: Record<DimensioneBarra, number> = { piccola: 7 * 20, media: 11 * 20, grande: 14 * 20 };
const BARRA_DIMS: DimensioneBarra[] = ['piccola', 'media', 'grande'];
const MENSOLA_DIMS: DimensioneMensola[] = ['piccola', 'media', 'lunga'];

const BARRA_PATTERN: Record<DimensioneBarra, TipoCapo[]> = {
  piccola: ['top', 'bottom', 'top', 'bottom', 'top', 'bottom'],
  media:   ['top', 'top', 'bottom', 'top', 'top', 'bottom', 'top', 'top', 'bottom'],
  grande:  ['top', 'top', 'bottom', 'top', 'top', 'bottom', 'top', 'top', 'bottom', 'top', 'top', 'bottom'],
};

const UNIT = 80;
const COSTA_W = 5;  // 1/3 of original 16 — narrow hangers on barra
const FRONTALE_W = 60; // 3 grid squares (3×20px)
const FRONTALE_H = 140;
const FRONTALE_TOP_H = 56;
const FRONTALE_BOT_H = 84;
const STRATO_H = 7;
const MENSOLA_W: Record<DimensioneMensola, number> = { piccola: FRONTALE_W, media: FRONTALE_W * 2, lunga: FRONTALE_W * 3 };

function defaultOffsetY(_tipo: TipoElementoParete): number {
  return 0;
}

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

// Returns true if the product is a clothing item (valid for barra appenderia)
const ACCESSORY_REGEX = /bijou|bigiotteria|gioiell|collana|bracciale|orecchino|anello|spilla|pendente|charm|borsa|bag|clutch|tote|shopper|zaino|backpack|bauletto|pochette|marsupio|foulard|sciarpa|stola|cintura|cappello|guanti|occhiali|belt|hat|scarf|portafoglio|wallet/;
function isAbbigliamento(p: Product): boolean {
  const all = [(p.famiglia ?? ''), (p.sottofamiglia ?? ''), p.name].join(' ').toLowerCase();
  return !ACCESSORY_REGEX.test(all);
}

function tipoFromProduct(p: Product, elementoTipo: TipoElementoParete): TipoCapo {
  const fam = (p.famiglia ?? '').toLowerCase();
  const sf = (p.sottofamiglia ?? '').toLowerCase();
  const name = p.name.toLowerCase();
  const all = fam + ' ' + sf + ' ' + name;
  if (/bijou|bigiotteria|gioiell|collana|bracciale|orecchino|anello|spilla|pendente|charm/.test(all)) {
    return elementoTipo === 'barra' ? 'top' : 'accessorio';
  }
  if (/borsa|bag|clutch|tote|shopper|zaino|backpack|bauletto|pochette|marsupio/.test(all)) {
    return elementoTipo === 'barra' ? 'top' : 'borsa';
  }
  if (/foulard|sciarpa|stola|cintura|cappello|guanti|occhiali|belt|hat|scarf|accessori|portafoglio|wallet/.test(all)) {
    return elementoTipo === 'barra' ? 'top' : 'accessorio';
  }
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
    let base = allProducts;
    // Barra appenderia: only clothing — no bags, accessories, bijou
    if (elementoTipo === 'barra') base = base.filter(isAbbigliamento);
    if (sourceTab === 'carrello' && cartProductIds) return base.filter((p) => cartProductIds.has(p.id));
    if (sourceTab === 'ordine' && orderProductIds) return base.filter((p) => orderProductIds.has(p.id));
    return base;
  }, [allProducts, elementoTipo, sourceTab, cartProductIds, orderProductIds]);

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
                className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left ${isChecked ? 'bg-accent/10' : 'hover:bg-gray-50'}`}>
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
              {onMoveLeft && <button type="button" onClick={onMoveLeft} disabled={!canMoveLeft} title="Sposta in su" className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-700 disabled:opacity-25 transition-colors"><ChevronUp size={13} /></button>}
              {onMoveRight && <button type="button" onClick={onMoveRight} disabled={!canMoveRight} title="Sposta in giù" className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-700 disabled:opacity-25 transition-colors"><ChevronDown size={13} /></button>}
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

          {/* Row 3: abbinamenti cromatici */}
          {item.productId && (
            <a href={`/moda/ruota-cromatica?productId=${item.productId}`}
              className="text-[9px] text-gray-300 hover:text-primary transition-colors self-start">
              abbinamenti cromatici →
            </a>
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
              {TIPO_OPTIONS_FRONTALE_SLOT1.map((t) => (
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
  const mItemDragIdxRef = useRef<number | null>(null);
  const [mItemDragOver, setMItemDragOver] = useState<number | null>(null);

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
        <div
          key={it.id}
          draggable
          onDragStart={() => { mItemDragIdxRef.current = idx; }}
          onDragOver={(e) => { e.preventDefault(); if (mItemDragIdxRef.current !== null && mItemDragIdxRef.current !== idx) setMItemDragOver(idx); }}
          onDrop={(e) => { e.preventDefault(); const from = mItemDragIdxRef.current; if (from !== null && from !== idx) { const a = [...config.items]; [a[from], a[idx]] = [a[idx], a[from]]; onChange({ ...config, items: a }); } mItemDragIdxRef.current = null; setMItemDragOver(null); }}
          onDragEnd={() => { mItemDragIdxRef.current = null; setMItemDragOver(null); }}
          className={`flex items-start gap-1.5 ${mItemDragOver === idx ? 'ring-2 ring-primary/30 ring-offset-1 rounded-xl' : ''}`}
        >
          <GripVertical size={12} className="mt-3.5 text-gray-300 hover:text-gray-500 flex-shrink-0 cursor-grab" />
          <div className="flex-1 min-w-0">
            <ItemCard item={it} tipoOptions={TIPO_OPTIONS_MENSOLA}
              onChange={(u) => updateItem(idx, u)} onDelete={() => removeItem(idx)}
              onMoveLeft={() => { const a = [...config.items]; [a[idx], a[idx - 1]] = [a[idx - 1], a[idx]]; onChange({ ...config, items: a }); }}
              onMoveRight={() => { const a = [...config.items]; [a[idx], a[idx + 1]] = [a[idx + 1], a[idx]]; onChange({ ...config, items: a }); }}
              canMoveLeft={idx > 0} canMoveRight={idx < config.items.length - 1} />
          </div>
        </div>
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
  const itemDragIdxRef = useRef<number | null>(null);
  const [itemDragOver, setItemDragOver] = useState<number | null>(null);

  useEffect(() => { if (isActive) setExpanded(true); }, [isActive]);

  const isBarra = el.tipo === 'barra';
  const isMensola = el.tipo === 'mensola';
  const isFrontale = el.tipo === 'frontale';
  const barraDim = (el.dimensione ?? 'media') as DimensioneBarra;
  const maxPz = isBarra ? BARRA_MAX_PZ[barraDim] : null;
  const pzCount = isBarra ? totalePezzi(el.items) : null;
  const pzOver = maxPz !== null && pzCount !== null && pzCount > maxPz;

  // Frontale: slot 1 may have a second slot only when tipo is top or capospalla
  const frontaleCanAddBottom = isFrontale && el.items.length === 1
    && (el.items[0].tipo === 'top' || el.items[0].tipo === 'capospalla');
  const canAddItem = !isFrontale || (el.items.length === 0) || frontaleCanAddBottom;

  // ── Mensola standalone item helpers ─────────────────────────────────────────
  function saveMensolaItems(items: ItemParete[]) {
    if (el.mensole?.length) {
      const m = [...el.mensole]; m[0] = { ...m[0], items }; onChange({ ...el, mensole: m });
    } else {
      onChange({ ...el, items });
    }
  }
  function updateMensolaItem(idx: number, updated: ItemParete) {
    const a = [...mensolaItems]; a[idx] = updated; saveMensolaItems(a);
  }
  function removeMensolaItem(idx: number) { saveMensolaItems(mensolaItems.filter((_, i) => i !== idx)); }
  function moveMensolaItem(from: number, to: number) {
    if (to < 0 || to >= mensolaItems.length) return;
    const a = [...mensolaItems]; [a[from], a[to]] = [a[to], a[from]]; saveMensolaItems(a);
  }

  function addFromCatalog(items: ItemParete[]) {
    if (isMensola) { saveMensolaItems([...mensolaItems, ...items]); return; }
    if (isFrontale && el.items.length === 1) {
      // Second slot must always be bottom
      const it = items[0];
      if (it) onChange({ ...el, items: [...el.items, { ...it, tipo: 'bottom' }] });
    } else {
      onChange({ ...el, items: [...el.items, ...items] });
    }
  }
  function updateItem(idx: number, updated: ItemParete) {
    const a = [...el.items];
    a[idx] = updated;
    // If frontale slot 1 changes to abito, remove slot 2 (incompatible combination)
    if (isFrontale && idx === 0 && updated.tipo === 'abito' && a.length > 1) {
      onChange({ ...el, items: [a[0]] });
    } else {
      onChange({ ...el, items: a });
    }
  }
  function removeItem(idx: number) { onChange({ ...el, items: el.items.filter((_, i) => i !== idx) }); }
  function moveItem(from: number, to: number) {
    if (to < 0 || to >= el.items.length) return;
    const a = [...el.items]; [a[from], a[to]] = [a[to], a[from]]; onChange({ ...el, items: a });
  }
  function applySuggerimento() {
    const pezziDefault = [{ taglia: 'S' }, { taglia: 'M' }, { taglia: 'L' }, { taglia: 'XL' }];
    onChange({ ...el, items: BARRA_PATTERN[barraDim].map((tipo) => ({ id: nanoid(8), tipo, pezzi: pezziDefault })) });
  }

  // ── Mensole array helpers (for barra/frontale: side mensole; for standalone mensola: stacked mensole) ──
  function getMensoleEl(): MensolaInlineConfig[] {
    if (el.mensole?.length) return el.mensole;
    if (el.mensolaTop) return [el.mensolaTop];
    return [];
  }
  function updateMensola(idx: number, cfg: MensolaInlineConfig) {
    const mensole = getMensoleEl();
    const next = [...mensole]; next[idx] = cfg;
    onChange({ ...el, mensole: next, mensolaTop: undefined });
  }
  function removeMensola(idx: number) {
    const mensole = getMensoleEl().filter((_, i) => i !== idx);
    onChange({ ...el, mensole, mensolaTop: undefined });
  }
  function addMensola() {
    const mensole = getMensoleEl();
    onChange({ ...el, mensole: [...mensole, { dimensione: 'media', items: [] }], mensolaTop: undefined });
  }

  const mensoleEl = getMensoleEl();
  const maxMensole = isMensola ? 4 : 2;

  // For standalone mensola: items live in mensole[0].items (fall back to el.items for old data)
  const mensolaItems = isMensola
    ? (el.mensole?.length ? el.mensole[0].items : el.items)
    : el.items;

  const elLabel = isBarra ? 'Barra' : isMensola ? 'Mensola' : 'Frontale';
  const totalPz = isMensola ? totalePezzi(mensolaItems) : totalePezzi(el.items);

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
            {(isMensola ? mensolaItems : el.items).length} prodotti{totalPz > 0 && ` · ${totalPz} pz`}{maxPz !== null && ` / max ${maxPz} pz`}{pzOver && ' — LIMITE SUPERATO'}
          </p>
        </button>
        {isBarra && (
          <div className="flex gap-1 flex-shrink-0">
            {BARRA_DIMS.map((d) => (
              <button key={d} type="button" onClick={() => onChange({ ...el, dimensione: d })}
                className={`px-2 py-0.5 text-2xs rounded-full transition-colors ${barraDim === d ? 'bg-primary text-white border border-primary' : 'text-gray-400 border border-gray-200 hover:border-gray-400'}`}>
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
          {/* Mensole array for barra/frontale */}
          {(isBarra || isFrontale) && (
            <div className="space-y-2">
              {mensoleEl.map((m, idx) => (
                <MensolaInlineEditor key={idx} config={m}
                  onChange={(c) => updateMensola(idx, c)}
                  onRemove={() => removeMensola(idx)} />
              ))}
            </div>
          )}
          {/* Items for barra and frontale */}
          {!isMensola && (
            <div className="space-y-2">
              {el.items.map((item, idx) => {
                const itemTipoOptions = isFrontale
                  ? (idx === 0 ? TIPO_OPTIONS_FRONTALE_SLOT1 : TIPO_OPTIONS_FRONTALE_SLOT2)
                  : isBarra ? TIPO_OPTIONS_BARRA : TIPO_OPTIONS_MENSOLA;
                return (
                  <div
                    key={item.id}
                    draggable={!isFrontale}
                    onDragStart={() => { itemDragIdxRef.current = idx; }}
                    onDragOver={(e) => { e.preventDefault(); if (itemDragIdxRef.current !== null && itemDragIdxRef.current !== idx) setItemDragOver(idx); }}
                    onDrop={(e) => { e.preventDefault(); const from = itemDragIdxRef.current; if (from !== null && from !== idx) moveItem(from, idx); itemDragIdxRef.current = null; setItemDragOver(null); }}
                    onDragEnd={() => { itemDragIdxRef.current = null; setItemDragOver(null); }}
                    className={`flex items-start gap-1.5 ${itemDragOver === idx ? 'ring-2 ring-primary/30 ring-offset-1 rounded-xl' : ''}`}
                  >
                    {!isFrontale && <GripVertical size={12} className="mt-3.5 text-gray-300 hover:text-gray-500 flex-shrink-0 cursor-grab" />}
                    <div className="flex-1 min-w-0">
                      <ItemCard item={item} tipoOptions={itemTipoOptions}
                        onChange={(u) => updateItem(idx, u)} onDelete={() => removeItem(idx)}
                        onMoveLeft={!isFrontale ? () => moveItem(idx, idx - 1) : undefined}
                        onMoveRight={!isFrontale ? () => moveItem(idx, idx + 1) : undefined}
                        canMoveLeft={idx > 0} canMoveRight={idx < el.items.length - 1} />
                    </div>
                  </div>
                );
              })}
              {canAddItem && (
                <button type="button" onClick={() => setShowCatalogPicker(true)}
                  className="w-full py-2 bg-primary/5 border border-primary/20 rounded-xl text-xs text-primary hover:bg-primary/10 transition-colors flex items-center justify-center gap-1.5 font-medium">
                  <PackagePlus size={13} />
                  {frontaleCanAddBottom ? 'Aggiungi bottom' : 'Aggiungi prodotto'}
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
          )}
          {/* Standalone mensola: direct item list + add button */}
          {isMensola && (
            <div className="space-y-2">
              {mensolaItems.map((item, idx) => (
                <div
                  key={item.id}
                  draggable
                  onDragStart={() => { itemDragIdxRef.current = idx; }}
                  onDragOver={(e) => { e.preventDefault(); if (itemDragIdxRef.current !== null && itemDragIdxRef.current !== idx) setItemDragOver(idx); }}
                  onDrop={(e) => { e.preventDefault(); const from = itemDragIdxRef.current; if (from !== null && from !== idx) moveMensolaItem(from, idx); itemDragIdxRef.current = null; setItemDragOver(null); }}
                  onDragEnd={() => { itemDragIdxRef.current = null; setItemDragOver(null); }}
                  className={`flex items-start gap-1.5 ${itemDragOver === idx ? 'ring-2 ring-primary/30 ring-offset-1 rounded-xl' : ''}`}
                >
                  <GripVertical size={12} className="mt-3.5 text-gray-300 hover:text-gray-500 flex-shrink-0 cursor-grab" />
                  <div className="flex-1 min-w-0">
                    <ItemCard item={item} tipoOptions={TIPO_OPTIONS_MENSOLA}
                      onChange={(u) => updateMensolaItem(idx, u)}
                      onDelete={() => removeMensolaItem(idx)}
                      onMoveLeft={() => moveMensolaItem(idx, idx - 1)}
                      onMoveRight={() => moveMensolaItem(idx, idx + 1)}
                      canMoveLeft={idx > 0} canMoveRight={idx < mensolaItems.length - 1} />
                  </div>
                </div>
              ))}
              <button type="button" onClick={() => setShowCatalogPicker(true)}
                className="w-full py-2 bg-primary/5 border border-primary/20 rounded-xl text-xs text-primary hover:bg-primary/10 transition-colors flex items-center justify-center gap-1.5 font-medium">
                <PackagePlus size={13} /> Aggiungi prodotto
              </button>
            </div>
          )}

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
          <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
            <p className="text-2xs text-gray-400 flex-1">Posizione verticale</p>
            <button type="button"
              onClick={() => onChange({ ...el, offsetY: Math.max(0, (el.offsetY ?? defaultOffsetY(el.tipo)) - 4) })}
              disabled={(el.offsetY ?? defaultOffsetY(el.tipo)) === 0}
              className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-gray-600 disabled:opacity-20 transition-colors">
              <ChevronUp size={14} />
            </button>
            <span className="text-2xs text-gray-400 font-mono min-w-[28px] text-center">{el.offsetY ?? defaultOffsetY(el.tipo)}px</span>
            <button type="button"
              onClick={() => onChange({ ...el, offsetY: (el.offsetY ?? defaultOffsetY(el.tipo)) + 4 })}
              className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-gray-600 transition-colors">
              <ChevronDown size={14} />
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
  config, onSelect, onUpdate, zoom,
}: {
  config: ElementoParete[];
  onSelect?: (id: string) => void;
  onUpdate?: (id: string, patch: Partial<ElementoParete>) => void;
  zoom?: number;
}) {
  const dragRef = useRef<{
    id: string; pointerId: number;
    startX: number; startY: number;
    startOffsetX: number; startOffsetY: number;
  } | null>(null);
  const lastLivePosRef = useRef<{ id: string; x: number; y: number } | null>(null);
  const [livePos, setLivePos] = useState<{ id: string; x: number; y: number } | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const PHOTO_SQ = 52; // square side in px for the top/bottom strips

  // Top strip: ALL product photos from mensole (in config order = left-to-right correspondence)
  const topPhotos = useMemo(() => {
    const out: Array<{ src: string | null; label?: string }> = [];
    for (const el of config) {
      if (el.tipo === 'mensola') {
        const mensole = el.mensole?.length ? el.mensole : [{ items: el.items, dimensione: (el.dimensione as DimensioneMensola) ?? 'media' }];
        for (const m of mensole) for (const it of m.items) out.push({ src: it.imageUrl ?? null, label: it.productName ?? undefined });
      } else {
        for (const m of getMensole(el)) for (const it of m.items) out.push({ src: it.imageUrl ?? null, label: it.productName ?? undefined });
      }
    }
    return out;
  }, [config]);

  // Bottom strip: ALL product photos from barre
  const bottomPhotos = useMemo(() => {
    const out: Array<{ src: string | null; label?: string }> = [];
    for (const el of config) {
      if (el.tipo === 'barra') for (const it of el.items) out.push({ src: it.imageUrl ?? null, label: it.productName ?? undefined });
    }
    return out;
  }, [config]);

  function startDrag(e: React.PointerEvent, el: ElementoParete) {
    if (e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    lastLivePosRef.current = null;
    dragRef.current = {
      id: el.id, pointerId: e.pointerId,
      startX: e.clientX, startY: e.clientY,
      startOffsetX: el.offsetX ?? 0,
      startOffsetY: el.offsetY ?? defaultOffsetY(el.tipo),
    };
    setDraggingId(el.id);
  }

  function onPointerMove(e: React.PointerEvent) {
    const d = dragRef.current;
    if (!d || e.pointerId !== d.pointerId) return;
    const z = zoom ?? 1;
    const rawX = d.startOffsetX + (e.clientX - d.startX) / z;
    const rawY = d.startOffsetY + (e.clientY - d.startY) / z;
    const np = { id: d.id, x: Math.max(0, rawX), y: Math.max(0, rawY) };
    lastLivePosRef.current = np;
    setLivePos(np);
  }

  function endDrag() {
    const pos = lastLivePosRef.current;
    const d = dragRef.current;
    if (!d) return;
    if (pos) {
      onUpdate?.(d.id, { offsetX: Math.round(pos.x), offsetY: Math.round(pos.y) });
    } else {
      onSelect?.(d.id);
    }
    setLivePos(null);
    lastLivePosRef.current = null;
    dragRef.current = null;
    setDraggingId(null);
  }

  const photoStripH = PHOTO_SQ + 8; // strip height = square + padding

  function PhotoStrip({ photos, align }: { photos: Array<{ src: string | null; label?: string }>; align: 'top' | 'bottom' }) {
    const slots = Math.max(4, photos.length);
    return (
      <div
        className={`flex-shrink-0 overflow-x-auto flex items-center gap-2 px-3 bg-gray-50/80 border-${align === 'top' ? 'b' : 't'} border-gray-100`}
        style={{ height: photoStripH }}
      >
        {Array.from({ length: slots }).map((_, i) => {
          const p = photos[i];
          return p?.src
            // eslint-disable-next-line @next/next/no-img-element
            ? <img key={i} src={p.src} alt={p.label ?? ''} draggable={false} title={p.label}
                className="object-contain rounded flex-shrink-0 border border-gray-100 bg-white"
                style={{ width: PHOTO_SQ, height: PHOTO_SQ }} />
            : <div key={i} className="flex-shrink-0 rounded border border-dashed border-gray-200 bg-white/60"
                style={{ width: PHOTO_SQ, height: PHOTO_SQ }} />;
        })}
      </div>
    );
  }

  if (config.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <PhotoStrip photos={[]} align="top" />
        <div className="flex-1 flex items-center justify-center text-gray-300 p-4"
          style={{
            backgroundImage: 'linear-gradient(rgba(0,0,0,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,0.05) 1px,transparent 1px)',
            backgroundSize: '20px 20px', backgroundColor: '#ffffff',
          }}>
          <p className="text-xs text-center">Aggiungi barre, mensole o frontali</p>
        </div>
        <PhotoStrip photos={[]} align="bottom" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Top strip: 4 squares — mensola photos */}
      <PhotoStrip photos={topPhotos} align="top" />

      {/* Main render area — grid background is INSIDE the zoomed div so grid squares scale with content */}
      <div className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden" style={{ backgroundColor: '#ffffff' }}>
        <div className="flex items-start h-full px-4"
          style={{
            gap: 16,
            ...(zoom !== undefined ? { zoom } : {}),
            backgroundImage: 'linear-gradient(rgba(0,0,0,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,0.05) 1px,transparent 1px)',
            backgroundSize: '20px 20px',
            backgroundColor: '#ffffff',
          }}
        >
          {config.map((el) => {
            const isLive = livePos?.id === el.id;
            const offsetX = isLive ? livePos!.x : (el.offsetX ?? 0);
            const offsetY = isLive ? livePos!.y : (el.offsetY ?? defaultOffsetY(el.tipo));
            const isDragging = draggingId === el.id;
            return (
              <div
                key={el.id}
                className="flex-shrink-0 h-full select-none"
                style={{ transform: `translateX(${offsetX}px)` }}
              >
                <div
                  className={`inline-block pt-1 ${isDragging ? 'opacity-60 cursor-grabbing' : 'cursor-grab'}`}
                  style={{ transform: `translateY(${offsetY}px)` }}
                  onPointerDown={(e) => startDrag(e, el)}
                  onPointerMove={onPointerMove}
                  onPointerUp={endDrag}
                  onPointerCancel={endDrag}
                >
                  <WallElementRenderer el={el} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom strip: 4 squares — barra photos */}
      <PhotoStrip photos={bottomPhotos} align="bottom" />
    </div>
  );
}

function MensolaBlock({ config }: { config: MensolaInlineConfig }) {
  return <div style={{ marginLeft: config.offsetX ?? 0 }}><MensolaRenderer config={config} /></div>;
}

// Resolve mensole array from element (supports both old mensolaTop and new mensole fields)
function getMensole(el: ElementoParete): MensolaInlineConfig[] {
  if (el.mensole?.length) return el.mensole;
  if (el.mensolaTop) return [el.mensolaTop];
  return [];
}

function WallElementRenderer({ el }: { el: ElementoParete }) {
  if (el.tipo === 'barra') {
    const dim = (el.dimensione ?? 'media') as DimensioneBarra;
    const pzTot = totalePezzi(el.items);
    const over = pzTot > BARRA_MAX_PZ[dim];
    const mensole = getMensole(el);

    const barraCore = (
      <div>
        <div className={`h-0.5 rounded ${over ? 'bg-red-400' : 'bg-gray-400'}`} style={{ minWidth: BARRA_W[dim] }} />
        <div className="flex items-start" style={{ gap: 1, minHeight: 48, minWidth: BARRA_W[dim] }}>
          {el.items.length === 0
            ? <div style={{ minWidth: BARRA_W[dim] }} />
            : el.items.map((it, i) => <CapoOnBarra key={it.id ?? i} item={it} />)}
        </div>
      </div>
    );

    if (mensole.length === 0) return <div className="flex-shrink-0">{barraCore}</div>;
    // Stack all mensole above the barra
    const mensoleSide = mensole.filter(m => m.posizione === 'fianco');
    const mensoleTop = mensole.filter(m => m.posizione !== 'fianco');
    if (mensoleSide.length > 0) {
      return (
        <div className="flex items-start gap-2 flex-shrink-0">
          <div className="flex flex-col items-start">
            {mensoleTop.map((m, i) => <MensolaBlock key={i} config={m} />)}
            <div style={{ marginTop: mensoleTop.length ? 12 : 0 }}>{barraCore}</div>
          </div>
          {mensoleSide.map((m, i) => <MensolaBlock key={`s${i}`} config={m} />)}
        </div>
      );
    }
    return (
      <div className="flex flex-col items-start flex-shrink-0">
        {mensoleTop.map((m, i) => <MensolaBlock key={i} config={m} />)}
        <div style={{ marginTop: 12 }}>{barraCore}</div>
      </div>
    );
  }

  if (el.tipo === 'mensola') {
    // Standalone mensola: el.dimensione is authoritative for the first shelf width
    const elDim = (el.dimensione as DimensioneMensola) ?? 'media';
    const mensole = el.mensole?.length
      ? el.mensole.map((m, i) => i === 0 ? { ...m, dimensione: elDim } : m)
      : [{ dimensione: elDim, items: el.items }];
    return (
      <div className="flex-shrink-0">
        {mensole.map((m, i) => (
          <MensolaRenderer key={i} config={m} />
        ))}
      </div>
    );
  }

  if (el.tipo === 'frontale') {
    const item1 = el.items[0];
    const item2 = el.items[1];
    const mensole = getMensole(el);

    const frontaleCore = item2 ? (
      <div style={{ width: FRONTALE_W }}>
        {item1?.imageUrl
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={item1.imageUrl} alt="" draggable={false} className="rounded-t border border-b-0 border-gray-200 object-contain bg-white" style={{ width: FRONTALE_W, height: FRONTALE_TOP_H }} />
          : <div className="rounded-t border border-b-0 border-gray-200" style={{ backgroundColor: item1?.coloreHex ?? '#e5e7eb', width: FRONTALE_W, height: FRONTALE_TOP_H }} />}
        {item2.imageUrl
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={item2.imageUrl} alt="" draggable={false} className="rounded-b border border-gray-200 object-contain bg-white" style={{ width: FRONTALE_W, height: FRONTALE_BOT_H }} />
          : <div className="rounded-b border border-gray-200" style={{ backgroundColor: item2.coloreHex ?? '#e5e7eb', width: FRONTALE_W, height: FRONTALE_BOT_H }} />}
      </div>
    ) : item1?.imageUrl ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={item1.imageUrl} alt="" draggable={false} className="rounded border border-gray-200 object-contain bg-white" style={{ width: FRONTALE_W, height: FRONTALE_H }} />
    ) : (
      <div className="rounded border border-gray-200" style={{ backgroundColor: item1?.coloreHex ?? '#e5e7eb', width: FRONTALE_W, height: FRONTALE_H }} />
    );

    const wrapper = (children: React.ReactNode) => (
      <div className="flex-shrink-0">{children}</div>
    );
    if (mensole.length === 0) return wrapper(frontaleCore);
    return wrapper(
      <div className="flex flex-col items-start">
        {mensole.map((m, i) => <MensolaBlock key={i} config={m} />)}
        <div style={{ marginTop: 12 }}>{frontaleCore}</div>
      </div>
    );
  }

  return null;
}

function MensolaRenderer({ config }: { config: MensolaInlineConfig }) {
  const w = MENSOLA_W[config.dimensione];

  return (
    <div>
      {/* Shelf items — color blocks */}
      <div className="flex items-end gap-0.5" style={{ minWidth: w }}>
        {config.items.length === 0
          ? <div style={{ width: w, height: STRATO_H }} />
          : config.items.map((it, i) => {
              const color = it.coloreHex ?? colorForTipo(it.tipo);
              if (it.tipo === 'borsa') {
                return <div key={it.id ?? i} className="flex-shrink-0 rounded-sm" style={{ backgroundColor: color, width: 50, height: 50 }} title={`Borsa (${it.pezzi.length}pz)`} />;
              }
              if (it.tipo === 'accessorio') {
                return <div key={it.id ?? i} className="flex-shrink-0 rounded-sm" style={{ backgroundColor: color, width: 30, height: 30 }} title={`Accessorio (${it.pezzi.length}pz)`} />;
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
    <div className="flex flex-shrink-0"
      title={`${TIPO_LABELS[item.tipo]}${item.productName ? ` — ${item.productName}` : ''} · ${item.pezzi.length}pz`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col items-center" style={{ width: COSTA_W }}>
          <div style={{ width: 1, height: 6, backgroundColor: '#9ca3af' }} />
          <div style={{ backgroundColor: color, width: COSTA_W, height: h }} />
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
  const [previewZoom, setPreviewZoom] = useState(1.0);
  const [zoomInputVal, setZoomInputVal] = useState('');
  const [editingZoom, setEditingZoom] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const initializedRef = useRef(false);
  const historyRef = useRef<ElementoParete[][]>([]);
  const futureRef = useRef<ElementoParete[][]>([]);
  const isDebouncing = useRef(false);

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

  function handleConfigChange(newConfig: ElementoParete[], skipHistory = false) {
    if (!skipHistory && !isDebouncing.current) {
      historyRef.current = [...historyRef.current.slice(-49), config];
      futureRef.current = [];
      setCanUndo(true);
      setCanRedo(false);
      isDebouncing.current = true;
    }
    setConfig(newConfig);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaveStatus('saving');
    saveTimerRef.current = setTimeout(() => {
      saveConfig(newConfig);
      isDebouncing.current = false;
    }, 1200);
  }

  function handleUndo() {
    if (!historyRef.current.length) return;
    const prev = historyRef.current[historyRef.current.length - 1];
    historyRef.current = historyRef.current.slice(0, -1);
    futureRef.current = [config, ...futureRef.current.slice(0, 49)];
    setCanUndo(historyRef.current.length > 0);
    setCanRedo(true);
    isDebouncing.current = false;
    handleConfigChange(prev, true);
  }

  function handleRedo() {
    if (!futureRef.current.length) return;
    const next = futureRef.current[0];
    futureRef.current = futureRef.current.slice(1);
    historyRef.current = [...historyRef.current.slice(-49), config];
    setCanUndo(true);
    setCanRedo(futureRef.current.length > 0);
    isDebouncing.current = false;
    handleConfigChange(next, true);
  }

  function applyZoomInput() {
    const v = parseInt(zoomInputVal, 10);
    if (!isNaN(v)) setPreviewZoom(Math.min(2, Math.max(0.4, v / 100)));
    setEditingZoom(false);
  }

  function handleNomeSave() {
    setEditingNome(false);
    if (nome.trim() && nome !== parete?.nome) saveConfig(config, nome.trim());
  }

  function addElemento(tipo: TipoElementoParete) {
    const id = nanoid(8);
    const newEl: ElementoParete = {
      id, tipo,
      dimensione: tipo === 'mensola' ? 'media' : tipo === 'barra' ? 'media' : undefined,
      items: [],
      ...(tipo === 'mensola' ? { mensole: [{ dimensione: 'media', items: [] }] } : {}),
    };
    handleConfigChange([...config, newEl]);
    setActiveElementId(id); // auto-espande la nuova card
    setTimeout(() => {
      document.getElementById(`card-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 80);
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
    <div className="flex flex-col h-full overflow-hidden bg-gray-50 text-gray-900">
      {/* Header — full width, always visible */}
      <div className="flex-shrink-0 bg-gray-50/95 backdrop-blur border-b border-gray-100 px-4 py-2 z-20">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/moda/pareti')} className="text-gray-400 hover:text-gray-700 transition-colors"><ArrowLeft size={16} /></button>
          <div className="flex-1 min-w-0 flex items-center gap-2">
            {editingNome ? (
              <input autoFocus value={nome} onChange={(e) => setNome(e.target.value)}
                onBlur={handleNomeSave}
                onKeyDown={(e) => { if (e.key === 'Enter') handleNomeSave(); if (e.key === 'Escape') { setNome(parete.nome); setEditingNome(false); } }}
                className="bg-transparent border-b border-gray-400 text-xs font-semibold uppercase tracking-wider text-gray-900 focus:outline-none" />
            ) : (
              <button type="button" onClick={() => setEditingNome(true)} className="flex items-center gap-1.5 group min-w-0">
                <h1 className="text-xs font-semibold uppercase tracking-wider truncate text-gray-900">{nome}</h1>
                <Edit2 size={10} className="text-gray-300 group-hover:text-gray-500 transition-colors flex-shrink-0" />
              </button>
            )}
            <span className="text-gray-300 text-2xs flex-shrink-0">·</span>
            <p className="text-2xs text-gray-400 whitespace-nowrap">{config.length} elementi · {totalCapi} capi · {totalPz} pz</p>
          </div>
          <div className="flex-shrink-0">
            {saveStatus === 'saving' && <Loader2 size={14} className="animate-spin text-gray-400" />}
            {saveStatus === 'saved' && <Check size={14} className="text-emerald-500" />}
          </div>
        </div>
      </div>

      {/* Body: left = scrollable cards, right = fixed preview */}
      <div className="flex flex-row flex-1 overflow-hidden">

        {/* LEFT: editor cards — own scroll */}
        <div className="flex-1 overflow-y-auto border-r border-gray-200">
          <div className="px-4 py-4 pb-24 space-y-3">
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
                <p className="text-xs mt-1 text-gray-300">Aggiungi barre appenderia, mensole ed esposizioni frontali usando i pulsanti a destra</p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: preview — fixed, never scrolls, always visible */}
        <div className="w-3/5 flex-shrink-0 flex flex-col bg-white border-l border-gray-200 shadow-sm overflow-hidden z-10">
          <div className="flex items-center gap-2 px-4 py-2 flex-shrink-0">
            <p className="text-2xs text-gray-400 uppercase tracking-widest flex-1">Anteprima parete</p>
            <button type="button" onClick={handleUndo} disabled={!canUndo} title="Annulla"
              className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-700 disabled:opacity-30 transition-colors">
              <Undo2 size={13} />
            </button>
            <button type="button" onClick={handleRedo} disabled={!canRedo} title="Ripristina"
              className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-700 disabled:opacity-30 transition-colors">
              <Redo2 size={13} />
            </button>
            <div className="w-px h-4 bg-gray-200 mx-1" />
            <button type="button" onClick={() => setPreviewZoom((z) => Math.max(0.4, +(z - 0.15).toFixed(2)))}
              className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors">
              <ZoomOut size={13} />
            </button>
            {editingZoom ? (
              <input
                autoFocus
                type="text"
                value={zoomInputVal}
                onChange={(e) => setZoomInputVal(e.target.value)}
                onFocus={(e) => e.currentTarget.select()}
                onBlur={applyZoomInput}
                onKeyDown={(e) => { if (e.key === 'Enter') applyZoomInput(); if (e.key === 'Escape') setEditingZoom(false); }}
                className="text-2xs text-gray-700 font-mono w-10 text-center bg-transparent border-b border-gray-400 focus:outline-none"
              />
            ) : (
              <button type="button" title="Clicca per inserire un valore"
                onClick={() => { setZoomInputVal(String(Math.round(previewZoom * 100))); setEditingZoom(true); }}
                className="text-2xs text-gray-400 font-mono w-8 text-center hover:text-gray-700 transition-colors">
                {Math.round(previewZoom * 100)}%
              </button>
            )}
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
          <div className="flex-1 min-h-0 border-t border-gray-100 overflow-hidden">
            <WallRenderer
              config={config}
              onSelect={handleSelectElement}
              onUpdate={(id, patch) => {
                const next = config.map((el) => el.id === id ? { ...el, ...patch } : el);
                handleConfigChange(next);
              }}
              zoom={previewZoom * 1.5}
            />
          </div>
        </div>

      </div>
    </div>
  );
}
