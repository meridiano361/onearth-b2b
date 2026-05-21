'use client';

import { useState, useMemo, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, FileText, CheckCircle, Minus, Plus, X, Database, Search, Loader2, MapPin, Copy } from 'lucide-react';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import { formatCurrency } from '@/lib/utils';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import type { Order, OrderItem, Product, Destinazione } from '@/types';

// ── Grouping options ───────────────────────────────────────────
const GROUPING_KEYS = [
  'nomLinea', 'collezione', 'colore', 'temaColore',
  'classe', 'sottoclasse', 'famiglia', 'gruppoOmogeneo',
  'stagione', 'tranche',
] as const;

type QtyMap = Record<string, number>;

// ── Product card ───────────────────────────────────────────────
function ProductCard({
  item,
  effectiveQty,
  effectiveSubtotal,
  isSaving,
  onQtyChange,
  onRemove,
  removeLabel,
  decreaseLabel,
  increaseLabel,
}: {
  item: OrderItem;
  effectiveQty: number;
  effectiveSubtotal: number;
  isSaving: boolean;
  onQtyChange: (id: string, qty: number) => void;
  onRemove: (id: string) => void;
  removeLabel: string;
  decreaseLabel: string;
  increaseLabel: string;
}) {
  const product = item.product!;
  const lotSize = product.lotSize || 1;
  const retailWithTax = product.retailPrice * (1 + product.iva / 100);

  return (
    <div className="bg-white border border-border flex flex-col">
      {/* Image */}
      <div className="relative aspect-[4/3] bg-[#C8C0B5] overflow-hidden">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            loading="lazy"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-xs font-mono text-white/80 tracking-wider text-center px-2">
              {product.code}
            </span>
          </div>
        )}
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
      <div className="p-2.5 flex flex-col gap-1.5 flex-1 min-h-0">
        <div>
          <p className="text-2xs font-mono text-gray-400 tracking-wider leading-none">{product.code}</p>
          <p className="text-xs font-medium text-primary leading-snug mt-1 line-clamp-2">{product.name}</p>
        </div>

        <p className="text-2xs text-gray-400 mt-auto">
          P.V.C. i.i.:{' '}
          <span className="text-gray-600 font-medium">{formatCurrency(retailWithTax)}</span>
        </p>

        {/* Quantity control */}
        <div className={`flex items-center justify-between pt-2 border-t border-border/60 ${isSaving ? 'opacity-60' : ''}`}>
          <div className="flex items-center border border-border overflow-hidden text-xs">
            <button
              onClick={() => onQtyChange(item.id, effectiveQty - lotSize)}
              disabled={isSaving || effectiveQty <= lotSize}
              className="px-2 py-1 hover:bg-cream border-r border-border disabled:opacity-30 transition-colors"
              aria-label={decreaseLabel}
            >
              <Minus size={9} />
            </button>
            <span className="px-2.5 py-1 font-medium text-center min-w-[2rem]">{effectiveQty}</span>
            <button
              onClick={() => onQtyChange(item.id, effectiveQty + lotSize)}
              disabled={isSaving}
              className="px-2 py-1 hover:bg-cream border-l border-border disabled:opacity-30 transition-colors"
              aria-label={increaseLabel}
            >
              <Plus size={9} />
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
}: {
  orderId: string;
  onClose: () => void;
  onAdded: () => void;
  addProductsLabel: string;
  searchPlaceholder: string;
  loadingLabel: string;
  noProductsLabel: string;
  addLabel: string;
}) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [addingId, setAddingId] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});

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
      const params = new URLSearchParams({ active: 'true', limit: '200' });
      if (debouncedSearch) params.set('search', debouncedSearch);
      const res = await fetch(`/api/products?${params}`);
      if (!res.ok) throw new Error();
      return (await res.json()).data as Product[];
    },
    staleTime: 30_000,
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

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-white w-full sm:max-w-lg sm:rounded-lg shadow-xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
          <p className="text-sm font-semibold text-primary">{addProductsLabel}</p>
          <button onClick={onClose} className="text-gray-400 hover:text-primary p-1 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2 border border-border rounded px-3 py-2">
            <Search size={13} className="text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="flex-1 text-xs outline-none bg-transparent text-primary placeholder-gray-400"
            />
          </div>
        </div>

        {/* Product list */}
        <div className="flex-1 overflow-y-auto">
          {isLoading && (
            <div className="flex items-center justify-center py-10">
              <LoadingSpinner text={loadingLabel} />
            </div>
          )}
          {!isLoading && (products ?? []).length === 0 && (
            <p className="text-center text-sm text-gray-400 py-10">{noProductsLabel}</p>
          )}
          {(products ?? []).map((product) => {
            const qty = quantities[product.id] ?? product.lotSize ?? 1;
            const isAdding = addingId === product.id;
            return (
              <div
                key={product.id}
                className="flex items-center gap-3 px-4 py-3 border-b border-border/50 hover:bg-cream/50 transition-colors"
              >
                {/* Thumbnail */}
                <div className="w-10 h-10 flex-shrink-0 bg-[#C8C0B5] overflow-hidden rounded">
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-2xs font-mono text-white/80">{product.code.slice(0, 4)}</span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-2xs font-mono text-gray-400 truncate">{product.code}</p>
                  <p className="text-xs text-primary truncate font-medium">{product.name}</p>
                  <p className="text-2xs text-gray-400">{formatCurrency(product.costPrice)}</p>
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
                    className="w-14 text-xs text-center border border-border rounded px-1.5 py-1 text-primary"
                  />
                  <button
                    onClick={() => handleAdd(product)}
                    disabled={isAdding}
                    className="text-xs bg-primary text-white px-2.5 py-1.5 rounded hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {isAdding ? '...' : addLabel}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Main view ──────────────────────────────────────────────────
export default function OrderPreviewView({ id }: { id: string }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const t = useTranslations('preview');
  const tg = useTranslations('groupings');

  const GROUPINGS = GROUPING_KEYS.map((k) => ({ value: k, label: tg(k) }));

  const [groupBy, setGroupBy] = useState('collezione');
  const [qtyOverrides, setQtyOverrides] = useState<QtyMap>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportingDemetra, setExportingDemetra] = useState(false);
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

  // Groups computed client-side from current groupBy
  const unclassifiedLabel = t('unclassified');
  const groups = useMemo(() => {
    const map = new Map<string, typeof items>();
    for (const item of items) {
      const key = (item.product as any)?.[groupBy] || unclassifiedLabel;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b, 'it'))
      .map(([name, grpItems]) => ({
        name,
        items: grpItems,
        subtotal: grpItems.reduce((s, it) => s + it.effectiveSubtotal, 0),
      }));
  }, [items, groupBy]);

  const grandTotal = useMemo(() => items.reduce((s, it) => s + it.effectiveSubtotal, 0), [items]);
  const grandQty   = useMemo(() => items.reduce((s, it) => s + it.effectiveQty, 0),   [items]);

  async function handleQtyChange(itemId: string, qty: number) {
    if (qty < 1) return;
    setQtyOverrides((prev) => ({ ...prev, [itemId]: qty }));
    setSavingId(itemId);
    try {
      const res = await fetch(`/api/orders/${id}/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: qty }),
      });
      if (!res.ok) throw new Error();
      // Invalidate the list view so totals refresh when user goes back
      queryClient.invalidateQueries({ queryKey: ['my-orders'] });
    } catch {
      setQtyOverrides((prev) => {
        const next = { ...prev };
        delete next[itemId];
        return next;
      });
      toast.error(t('updateQtyError'));
    } finally {
      setSavingId(null);
    }
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

  async function handleExportDemetra() {
    if (exportingDemetra) return;
    setExportingDemetra(true);
    try {
      const csvItems = (order?.items ?? []).filter((it) => it.product != null);
      const csv =
        'Codice;Quantità;Tranche\r\n' +
        csvItems
          .map((it) => {
            const qty = qtyOverrides[it.id] ?? it.quantity;
            const tranche = (it.product as any)?.tranche ?? '';
            return `${it.product?.code};${qty};${tranche}`;
          })
          .join('\r\n');
      const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ordine-demetra-${id.slice(0, 8)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      // Mark as ESPORTATO
      const res = await fetch(`/api/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ESPORTATO' }),
      });
      if (!res.ok) throw new Error();
      toast.success(t('exportSuccess'));
      queryClient.invalidateQueries({ queryKey: ['my-orders'] });
      queryClient.invalidateQueries({ queryKey: ['order-preview', id] });
    } catch {
      toast.error(t('exportError'));
    } finally {
      setExportingDemetra(false);
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

      {addProductsOpen && (
        <AddProductsModal
          orderId={id}
          onClose={() => setAddProductsOpen(false)}
          addProductsLabel={t('addProducts')}
          searchPlaceholder={t('searchPlaceholder')}
          loadingLabel={t('loading')}
          noProductsLabel={t('noProducts')}
          addLabel={t('add')}
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
                #{order.id.slice(0, 8).toUpperCase()}
              </p>
            </div>
          </div>
          <div className="text-right text-xs text-gray-500">
            <p>{items.length} art. · {grandQty} pz.</p>
            <p className="font-semibold text-primary text-sm">{formatCurrency(grandTotal)}</p>
          </div>
        </div>
      </div>

      {/* ── Grouping tabs ─────────────────────────────────── */}
      <div className="sticky top-[57px] z-10 bg-white border-b border-border">
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
          <p className="text-sm text-gray-400 text-center py-16">{t('noItems')}</p>
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
                  isSaving={savingId === item.id}
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
      </div>

      {/* ── Fixed footer ──────────────────────────────────── */}
      <div className="
        fixed bottom-16 left-0 right-0 z-20
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

            {/* Duplica ordine */}
            <button
              onClick={() => { setDupCanaleId(order.canaleId ?? ''); setShowDupModal(true); }}
              className="flex items-center gap-1.5 px-3 py-2 text-xs border border-border rounded hover:bg-cream transition-colors text-gray-600 hover:text-primary flex-shrink-0"
            >
              <Copy size={12} />
              <span className="hidden sm:inline">Duplica</span>
            </button>

            {/* Esporta in Demetra — primary CTA */}
            {order.status === 'ESPORTATO' ? (
              <div className="flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs bg-green-100 text-green-700 rounded flex-shrink-0 cursor-default">
                <CheckCircle size={12} />
                <span className="hidden sm:inline">{t('alreadyExported')}</span>
              </div>
            ) : (
              <button
                onClick={handleExportDemetra}
                disabled={exportingDemetra || items.length === 0}
                className="flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs bg-primary text-white rounded hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
              >
                {exportingDemetra ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Database size={12} />
                )}
                <span className="hidden sm:inline">
                  {exportingDemetra ? t('exportingDemetra') : t('exportDemetra')}
                </span>
                <span className="sm:hidden">Demetra</span>
              </button>
            )}
          </div>

          {/* Total */}
          <div className="text-right flex-shrink-0">
            <p className="text-2xs text-gray-400 uppercase tracking-widest hidden sm:block">{t('total')}</p>
            <p className="text-base font-bold text-primary">{formatCurrency(grandTotal)}</p>
          </div>
        </div>
      </div>

    </div>
  );
}
