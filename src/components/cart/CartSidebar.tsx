'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ShoppingCart, Trash2, AlertTriangle, Send, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import { useCartStore } from '@/store/cartStore';
import CartItem from './CartItem';
import CartSummary from './CartSummary';
import type { Canale } from '@/types';

export default function CartSidebar() {
  const router = useRouter();
  const { data: session } = useSession();
  const { items, collectionId, notes, clearCart, getTotalItems, hasLotWarnings } = useCartStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [canali, setCanali] = useState<Canale[]>([]);
  const [showCanaleModal, setShowCanaleModal] = useState(false);
  const [selectedCanaleId, setSelectedCanaleId] = useState('');
  const t = useTranslations('cart');

  const totalItems = getTotalItems();
  const hasWarnings = hasLotWarnings();
  const isEmpty = items.length === 0;
  const isOperator = session?.user.role === 'OPERATOR';

  useEffect(() => {
    if (isOperator && session?.user.organizationId) {
      fetch(`/api/canali?organizationId=${session.user.organizationId}`)
        .then((r) => r.json())
        .then((d) => {
          const list: Canale[] = d.data || [];
          setCanali(list);
          if (list.length >= 1) setSelectedCanaleId(list[0].id);
        })
        .catch(() => {});
    }
  }, [isOperator, session?.user.organizationId]);

  async function submitOrder(canaleId?: string) {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collectionId: collectionId || null,
          notes: notes || null,
          canaleId: canaleId || null,
          items: items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            unitPrice: i.product.costPrice,
          })),
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? t('errorCreate'));
      clearCart();
      toast.success('Ordine creato con successo');
      router.push('/catalog/orders');
    } catch (e: any) {
      toast.error(e.message ?? t('errorCreate'));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCreateOrder() {
    if (isSubmitting || isEmpty) return;

    if (isOperator) {
      if (canali.length === 0) {
        await submitOrder(undefined);
      } else if (canali.length === 1) {
        await submitOrder(canali[0].id);
      } else {
        setShowCanaleModal(true);
      }
    } else {
      await submitOrder(undefined);
    }
  }

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="px-4 py-4 border-b border-border flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <ShoppingCart size={15} className="text-gray-500" />
            <span className="text-xs font-medium text-primary tracking-wide">{t('title')}</span>
            {totalItems > 0 && (
              <span className="bg-primary text-background text-2xs font-medium px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                {totalItems}
              </span>
            )}
          </div>
          {!isEmpty && (
            <button
              onClick={() => {
                if (confirm(t('clearConfirm'))) clearCart();
              }}
              className="text-gray-300 hover:text-gray-600 transition-colors"
              title={t('clearTooltip')}
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
              <p className="text-sm text-gray-400 font-light">{t('emptyTitle')}</p>
              <p className="text-2xs text-gray-300 mt-1">{t('emptyHint')}</p>
            </div>
          ) : (
            <div>
              {hasWarnings && (
                <div className="mx-4 mt-3 mb-0 flex items-center gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded">
                  <AlertTriangle size={13} className="text-amber-500 flex-shrink-0" />
                  <p className="text-2xs text-amber-700">{t('lotWarning')}</p>
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
                  {t('fixLots')}
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
                      {t('creating')}
                    </>
                  ) : (
                    <>
                      <Send size={12} />
                      {t('createOrder')}
                    </>
                  )}
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Canale selection modal */}
      {showCanaleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowCanaleModal(false)}
          />
          <div className="relative bg-white rounded-lg shadow-2xl w-full max-w-sm p-6 z-10">
            <h3 className="text-sm font-semibold text-primary mb-1 tracking-wide">{t('selectCanaleTitle')}</h3>
            <p className="text-xs text-gray-400 mb-4">{t('selectCanalePlaceholder')}</p>

            <select
              value={selectedCanaleId}
              onChange={(e) => setSelectedCanaleId(e.target.value)}
              className="w-full px-4 py-2.5 bg-white border border-border rounded text-sm text-primary focus:outline-none focus:border-accent mb-4"
            >
              {canali.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}{c.citta ? ` — ${c.citta}` : ''}
                </option>
              ))}
            </select>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCanaleModal(false)}
                className="flex-1 py-2.5 text-xs font-medium rounded border border-border text-gray-500 hover:bg-cream transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={() => {
                  setShowCanaleModal(false);
                  submitOrder(selectedCanaleId || undefined);
                }}
                disabled={isSubmitting}
                className="flex-1 py-2.5 text-xs font-medium rounded bg-primary text-background hover:bg-warm-darker transition-colors flex items-center justify-center gap-1.5 disabled:opacity-60"
              >
                <Send size={11} />
                {t('selectCanaleConfirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
