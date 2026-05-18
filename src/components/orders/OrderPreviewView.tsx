'use client';

import { useState, useMemo, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { ArrowLeft, FileText, CheckCircle, Minus, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCurrency } from '@/lib/utils';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import type { Order, OrderItem } from '@/types';

// ── Grouping options ───────────────────────────────────────────
const GROUPINGS = [
  { value: 'nomLinea',          label: 'Linea' },
  { value: 'collezione',        label: 'Collezione' },
  { value: 'colore',            label: 'Colore' },
  { value: 'temaColore',        label: 'Tema colore' },
  { value: 'classe',            label: 'Classe' },
  { value: 'sottoclasse',       label: 'Sottoclasse' },
  { value: 'famiglia',          label: 'Famiglia' },
  { value: 'gruppoOmogeneo',    label: 'Gruppo omogeneo' },
  { value: 'stagione',          label: 'Stagione' },
];

type QtyMap = Record<string, number>;

// ── Product card ───────────────────────────────────────────────
function ProductCard({
  item,
  effectiveQty,
  effectiveSubtotal,
  isSaving,
  onQtyChange,
}: {
  item: OrderItem;
  effectiveQty: number;
  effectiveSubtotal: number;
  isSaving: boolean;
  onQtyChange: (id: string, qty: number) => void;
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
              aria-label="Diminuisci"
            >
              <Minus size={9} />
            </button>
            <span className="px-2.5 py-1 font-medium text-center min-w-[2rem]">{effectiveQty}</span>
            <button
              onClick={() => onQtyChange(item.id, effectiveQty + lotSize)}
              disabled={isSaving}
              className="px-2 py-1 hover:bg-cream border-l border-border disabled:opacity-30 transition-colors"
              aria-label="Aumenta"
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

// ── Main view ──────────────────────────────────────────────────
export default function OrderPreviewView({ id }: { id: string }) {
  const queryClient = useQueryClient();
  const [groupBy, setGroupBy] = useState('collezione');
  const [qtyOverrides, setQtyOverrides] = useState<QtyMap>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const tabsRef = useRef<HTMLDivElement>(null);

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
  const groups = useMemo(() => {
    const map = new Map<string, typeof items>();
    for (const item of items) {
      const key = (item.product as any)?.[groupBy] || 'Non classificato';
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
      toast.error('Impossibile aggiornare la quantità');
    } finally {
      setSavingId(null);
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
      toast.success('PDF pronto');
    } catch {
      toast.error('Errore generazione PDF');
    } finally {
      setExporting(false);
    }
  }

  const currentGroupLabel = GROUPINGS.find((g) => g.value === groupBy)?.label ?? '';

  // ── Loading / error states ─────────────────────────────────
  if (isLoading) return <LoadingSpinner fullPage text="Caricamento ordine..." />;
  if (error || !order) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-4">
        <p className="text-sm text-gray-500">Ordine non trovato.</p>
        <Link href="/orders" className="mt-3 text-sm text-accent hover:underline">
          ← Torna agli ordini
        </Link>
      </div>
    );
  }

  // ── Main render ────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-full">

      {/* ── Page header ──────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-white border-b border-border">
        <div className="px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/orders"
              className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-primary hover:bg-cream rounded transition-colors"
            >
              <ArrowLeft size={16} />
            </Link>
            <div>
              <p className="text-2xs font-medium tracking-widest uppercase text-gray-400 leading-none">
                Anteprima ordine
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

      {/* ── Content ───────────────────────────────────────── */}
      <div className="flex-1 px-4 sm:px-6 py-6 pb-32 lg:pb-24">
        {groups.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-16">Nessun prodotto nell&apos;ordine.</p>
        )}

        {groups.map((group) => (
          <section key={group.name} className="mb-10">
            {/* Group header */}
            <div className="bg-primary text-white px-4 py-3 flex items-center justify-between mb-4">
              <div>
                <p className="text-xs font-bold tracking-[0.12em] uppercase">{group.name}</p>
                <p className="text-2xs text-gray-400 mt-0.5">
                  {group.items.length} articol{group.items.length === 1 ? 'o' : 'i'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xs text-gray-400">Subtotale</p>
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
                />
              ))}
            </div>

            {/* Group subtotal line */}
            <div className="flex justify-end items-center gap-3 mt-4 pt-3 border-t border-border/50 text-xs">
              <span className="text-gray-400 uppercase tracking-widest">
                Subtotale {group.name}
              </span>
              <span className="font-semibold text-primary text-sm">
                {formatCurrency(group.subtotal)}
              </span>
            </div>
          </section>
        ))}
      </div>

      {/* ── Fixed footer ──────────────────────────────────── */}
      {/*
        On mobile: bottom-16 (64 px) to clear the fixed MobileNav (≈60 px tall).
        On desktop lg+: bottom-0, right-80/xl:right-[340px] to clear the CartSidebar.
      */}
      <div className="
        fixed bottom-16 left-0 right-0 z-20
        lg:bottom-0 lg:right-80 xl:right-[340px]
        bg-white border-t border-border shadow-[0_-2px_8px_rgba(0,0,0,0.06)]
      ">
        <div className="px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          {/* Back */}
          <Link
            href="/orders"
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary transition-colors flex-shrink-0"
          >
            <ArrowLeft size={14} />
            <span className="hidden sm:inline">Torna all&apos;ordine</span>
          </Link>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportPDF}
              disabled={exporting}
              className="flex items-center gap-1.5 px-3 py-2 text-xs border border-border rounded hover:bg-cream transition-colors text-gray-600 hover:text-primary disabled:opacity-50 flex-shrink-0"
            >
              <FileText size={12} />
              <span className="hidden sm:inline">
                {exporting ? 'Generando…' : `PDF · ${currentGroupLabel}`}
              </span>
              <span className="sm:hidden">PDF</span>
            </button>

            <button
              onClick={() => {
                toast.success('Ordine già confermato!');
              }}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs bg-primary text-white rounded hover:bg-primary/90 transition-colors flex-shrink-0"
            >
              <CheckCircle size={12} />
              <span className="hidden sm:inline">Conferma Ordine</span>
              <span className="sm:hidden">Conferma</span>
            </button>
          </div>

          {/* Total */}
          <div className="text-right flex-shrink-0">
            <p className="text-2xs text-gray-400 uppercase tracking-widest hidden sm:block">Totale</p>
            <p className="text-base font-bold text-primary">{formatCurrency(grandTotal)}</p>
          </div>
        </div>
      </div>

    </div>
  );
}
