'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingCart, Trash2, AlertTriangle, Send, Download } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import CartItem from './CartItem';
import CartSummary from './CartSummary';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';
import { cn, formatCurrency } from '@/lib/utils';
import type { Category } from '@/types';

export default function CartSidebar() {
  const { data: session } = useSession();
  const router = useRouter();
  const { items, clearCart, getTotalItems, hasLotWarnings, notes, setNotes } = useCartStore();
  const [isConfirming, setIsConfirming] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const totalItems = getTotalItems();
  const hasWarnings = hasLotWarnings();
  const isEmpty = items.length === 0;

  // Group items by macro-category
  const grouped = items.reduce<Record<string, typeof items>>((acc, item) => {
    const catName = item.product.category?.name || 'Other';
    if (!acc[catName]) acc[catName] = [];
    acc[catName].push(item);
    return acc;
  }, {});

  async function handleConfirmOrder() {
    if (isEmpty) return;
    setIsConfirming(true);
    try {
      const payload = {
        customerId: session?.user?.id,
        items: items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          unitPrice: i.product.costPrice,
        })),
        notes,
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to confirm order');
      }

      const { data: order } = await res.json();
      clearCart();
      toast.success('Ordine confermato con successo!');
      router.push(`/orders?highlight=${order.id}`);
    } catch (err: any) {
      toast.error(err.message || 'Impossibile confermare l\'ordine');
    } finally {
      setIsConfirming(false);
    }
  }

  async function handleExportExcel() {
    if (isEmpty) return;
    setIsExporting(true);
    try {
      const payload = {
        items: items.map((i) => ({
          productId: i.productId,
          productCode: i.product.code,
          productName: i.product.name,
          quantity: i.quantity,
          unitPrice: i.product.costPrice,
          categoryName: i.product.category?.name,
        })),
        customerCode: session?.user?.customerCode,
        companyName: session?.user?.companyName,
      };

      const res = await fetch('/api/export/excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Export failed');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `order-${session?.user?.customerCode}-${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Excel esportato');
    } catch {
      toast.error('Esportazione fallita');
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-4 border-b border-border flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <ShoppingCart size={15} className="text-gray-500" />
          <span className="text-xs font-medium text-primary tracking-wide">Ordine Corrente</span>
          {totalItems > 0 && (
            <span className="bg-primary text-background text-2xs font-medium px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
              {totalItems}
            </span>
          )}
        </div>
        {!isEmpty && (
          <button
            onClick={() => {
              if (confirm('Svuotare l\'intero ordine?')) clearCart();
            }}
            className="text-gray-300 hover:text-gray-600 transition-colors"
            title="Svuota carrello"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full py-12 px-4 text-center">
            <ShoppingCart size={32} className="text-gray-200 mb-3" />
            <p className="text-sm text-gray-400 font-light">Il tuo ordine è vuoto</p>
            <p className="text-2xs text-gray-300 mt-1">Clicca su qualsiasi prodotto per aggiungerlo</p>
          </div>
        ) : (
          <div>
            {hasWarnings && (
              <div className="mx-4 mt-3 mb-0 flex items-center gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded">
                <AlertTriangle size={13} className="text-amber-500 flex-shrink-0" />
                <p className="text-2xs text-amber-700">Alcune quantità non corrispondono ai lotti richiesti</p>
              </div>
            )}

            {Object.entries(grouped).map(([category, categoryItems]) => (
              <div key={category}>
                <div className="px-4 pt-3 pb-1.5">
                  <p className="label-luxury text-gray-400">{category}</p>
                </div>
                {categoryItems.map((item) => (
                  <CartItem key={item.productId} item={item} />
                ))}
              </div>
            ))}

            {/* Notes */}
            <div className="px-4 py-3 border-t border-border/50">
              <label className="label-luxury mb-1.5 block">Note Ordine</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Aggiungi note, istruzioni speciali..."
                rows={2}
                className="w-full text-xs border border-border rounded px-3 py-2 resize-none focus:outline-none focus:border-accent bg-white placeholder-gray-300"
              />
            </div>
          </div>
        )}
      </div>

      {/* Summary and actions */}
      {!isEmpty && (
        <>
          <CartSummary />

          <div className="px-4 pb-4 space-y-2 flex-shrink-0">
            <button
              onClick={handleExportExcel}
              disabled={isExporting}
              className="w-full py-2 text-xs font-medium border border-border rounded hover:bg-cream transition-colors flex items-center justify-center gap-2 text-gray-600 disabled:opacity-50"
            >
              <Download size={12} />
              Esporta Excel
            </button>

            <button
              onClick={handleConfirmOrder}
              disabled={isConfirming || hasWarnings}
              className={cn(
                'w-full py-2.5 text-xs font-medium rounded transition-all duration-150 flex items-center justify-center gap-2',
                hasWarnings
                  ? 'bg-amber-100 text-amber-700 cursor-not-allowed'
                  : 'bg-primary text-background hover:bg-warm-darker disabled:opacity-60'
              )}
            >
              {isConfirming ? (
                <>In elaborazione...</>
              ) : hasWarnings ? (
                <>Correggi prima i lotti</>
              ) : (
                <>
                  <Send size={12} />
                  Conferma Ordine
                </>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
