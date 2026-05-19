'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingCart, Trash2, AlertTriangle, Send, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCartStore } from '@/store/cartStore';
import CartItem from './CartItem';
import CartSummary from './CartSummary';

export default function CartSidebar() {
  const router = useRouter();
  const { items, collectionId, notes, clearCart, getTotalItems, hasLotWarnings } = useCartStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalItems = getTotalItems();
  const hasWarnings = hasLotWarnings();
  const isEmpty = items.length === 0;

  async function handleCreateOrder() {
    if (isSubmitting || isEmpty) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collectionId: collectionId || null,
          notes: notes || null,
          items: items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            unitPrice: i.product.costPrice,
          })),
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'Errore nella creazione ordine');
      clearCart();
      toast.success('Ordine creato con successo');
      router.push(`/catalog/orders/${body.data.id}/preview`);
    } catch (e: any) {
      toast.error(e.message ?? 'Impossibile creare l\'ordine');
    } finally {
      setIsSubmitting(false);
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

            {items.map((item) => (
              <CartItem key={item.productId} item={item} />
            ))}


          </div>
        )}
      </div>

      {/* Summary and actions */}
      {!isEmpty && (
        <>
          <CartSummary />

          <div className="px-4 pb-4 flex-shrink-0">
            {hasWarnings ? (
              <div className="w-full py-2.5 text-xs font-medium rounded flex items-center justify-center gap-2 bg-amber-100 text-amber-700 cursor-not-allowed">
                Correggi prima i lotti
              </div>
            ) : (
              <button
                onClick={handleCreateOrder}
                disabled={isSubmitting}
                className="w-full py-2.5 text-xs font-medium rounded transition-all duration-150 flex items-center justify-center gap-2 bg-primary text-background hover:bg-warm-darker disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={12} className="animate-spin" />
                    Invio in corso...
                  </>
                ) : (
                  <>
                    <Send size={12} />
                    Crea Ordine
                  </>
                )}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
