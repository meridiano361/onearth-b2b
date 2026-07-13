'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import { ShoppingCart, Trash2, AlertTriangle, Send, Loader2, ShoppingBag, Plus, ArrowLeftRight } from 'lucide-react';
import Link from 'next/link';
import { ProductImage } from '@/components/ui/ProductImage';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import { formatCurrency } from '@/lib/utils';
import { useCartStore } from '@/store/cartStore';
import { useQueryClient } from '@tanstack/react-query';
import { usePreview } from '@/contexts/PreviewContext';
import { useSettings } from '@/contexts/SettingsContext';
import { computeProjections } from './CartSummary';
import CartItem from './CartItem';
import CartSummary from './CartSummary';
import { CreateOrderModal } from '@/components/orders/CreateOrderModal';
import { useCollectionRoutes } from '@/hooks/useCollectionRoutes';
import type { Destinazione, Product } from '@/types';

type SuggestionProduct = Pick<Product, 'id' | 'code' | 'name' | 'imageUrl' | 'costPrice' | 'retailPrice' | 'lotSize' | 'iva'>;

export default function CartSidebar() {
  const router = useRouter();
  const { data: session } = useSession();
  const preview = usePreview();
  const { ordine } = useSettings();
  const routes = useCollectionRoutes();
  const { items, cartId, cartName, notes, clearCart, removeItem, getTotalItems, hasLotWarnings, setPendingProduct, setShowCartPicker } = useCartStore();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [destinazioni, setDestinazioni] = useState<Destinazione[]>([]);
  const [selectedDestinazioneId, setSelectedDestinazioneId] = useState('');
  const [showCreateOrderModal, setShowCreateOrderModal] = useState(false);
  const t = useTranslations('cart');
  const ts = useTranslations('cartSummary');

  const totalItems = getTotalItems();
  const hasWarnings = hasLotWarnings();
  const isEmpty = items.length === 0;
  const isOperator = session?.user.role === 'OPERATOR';

  useEffect(() => {
    if (!preview && !isOperator) return;
    fetch('/api/catalog/destinazioni')
      .then((r) => r.json())
      .then((d) => {
        const list: Destinazione[] = d.data || [];
        setDestinazioni(list);
        if (list.length >= 1) setSelectedDestinazioneId(list[0].id);
      })
      .catch(() => {});
  }, [isOperator, preview]);

  // Suggestions
  const productIds = items.map((i) => i.productId).join(',');
  const { data: suggestionsData } = useQuery<{ data: SuggestionProduct[] }>({
    queryKey: ['suggestions', productIds],
    queryFn: () =>
      fetch(`/api/catalog/suggestions?productIds=${productIds}`).then((r) => r.json()),
    enabled: items.length > 0,
    staleTime: 1000 * 60,
  });
  const suggestions = suggestionsData?.data ?? [];

  // Barra di riferimento budget destinazione (non budget ordine)
  const selectedCanale = useMemo(
    () => destinazioni.find((c) => c.id === selectedDestinazioneId),
    [destinazioni, selectedDestinazioneId]
  );
  const budget = selectedCanale?.budget ?? null;
  const { costTotal } = useMemo(() => computeProjections(items), [items]);
  const budgetPct = budget && budget > 0 ? (costTotal / budget) * 100 : 0;
  const budgetRemaining = budget != null ? budget - costTotal : null;

  async function submitOrder(canaleId?: string, budgetPersonalizzato?: number | null) {
    if (!cartId) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/catalog/carts/${cartId}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          canaleId: canaleId || null,
          budgetPersonalizzato: budgetPersonalizzato ?? null,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? t('errorCreate'));
      clearCart();
      queryClient.invalidateQueries({ queryKey: ['my-carts'] });
      toast.success('Ordine creato con successo');
      router.push(routes.orders);
    } catch (e: any) {
      toast.error(e.message ?? t('errorCreate'));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCreateOrder() {
    if (isSubmitting || isEmpty) return;
    if (isOperator) {
      setShowCreateOrderModal(true);
    } else {
      await submitOrder();
    }
  }

  const barColor =
    budgetPct > 100 ? 'bg-red-500' :
    budgetPct > 90  ? 'bg-orange-400' :
    budgetPct > 70  ? 'bg-yellow-400' :
    'bg-emerald-500';

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="px-4 py-4 border-b border-border flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <ShoppingCart size={15} className="text-gray-500 flex-shrink-0" />
            <div className="min-w-0">
              <span className="text-xs font-medium text-primary tracking-wide block truncate">
                {cartName ?? t('title')}
              </span>
              {cartName && (
                <span className="text-2xs text-gray-400">{t('title')}</span>
              )}
            </div>
            {totalItems > 0 && (
              <span className="bg-primary text-background text-2xs font-medium px-1.5 py-0.5 rounded-full min-w-[18px] text-center flex-shrink-0">
                {totalItems}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setShowCartPicker(true)}
              className="text-gray-300 hover:text-gray-600 transition-colors"
              title="Cambia carrello"
            >
              <ArrowLeftRight size={13} />
            </button>
            {cartId && (
              <button
                onClick={async () => {
                  if (!confirm('Eliminare definitivamente questo carrello?')) return;
                  try {
                    await fetch(`/api/catalog/carts/${cartId}`, { method: 'DELETE' });
                    clearCart();
                    queryClient.invalidateQueries({ queryKey: ['my-carts'] });
                  } catch {
                    toast.error('Errore durante l\'eliminazione del carrello');
                  }
                }}
                className="text-gray-300 hover:text-red-400 transition-colors"
                title="Elimina carrello"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Aggiungi prodotti */}
        {cartId && (
          <div className="px-4 pt-2 pb-2 flex-shrink-0">
            <Link
              href={routes.catalog}
              className="w-full py-1.5 text-xs font-medium rounded border border-dashed border-border text-gray-400 hover:text-primary hover:border-primary transition-colors flex items-center justify-center gap-1.5"
            >
              <Plus size={11} /> Aggiungi prodotti
            </Link>
          </div>
        )}

        {/* Items */}
        <div className="flex-1 overflow-y-auto">
          {isEmpty ? (
            <div className="flex flex-col items-center justify-center h-full py-12 px-4 text-center">
              <ShoppingCart size={32} className="text-gray-200 mb-3" />
              <p className="text-sm text-gray-400 font-light">{cartId ? t('emptyTitle') : 'Nessun carrello attivo'}</p>
              <p className="text-2xs text-gray-300 mt-1">
                {cartId ? t('emptyHint') : 'Vai in Carrelli per crearne uno'}
              </p>
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
                <CartItem key={item.productId + '||' + (item.taglia ?? '')} item={item} />
              ))}
            </div>
          )}
        </div>

        {/* Summary, barra budget destinazione, suggerimenti */}
        {!isEmpty && (
          <>
            {/* Crea Ordine */}
            <div className="px-4 pt-3 pb-3 border-t border-border flex-shrink-0">
              {preview ? (
                <div className="w-full py-2 text-xs font-medium rounded flex items-center justify-center gap-2 bg-amber-100 text-amber-700 cursor-not-allowed">
                  Non puoi creare ordini in modalità anteprima
                </div>
              ) : hasWarnings ? (
                <div className="w-full py-2 text-xs font-medium rounded flex items-center justify-center gap-2 bg-amber-100 text-amber-700 cursor-not-allowed">
                  {t('fixLots')}
                </div>
              ) : (
                <button
                  onClick={handleCreateOrder}
                  disabled={isSubmitting}
                  className="w-full py-2 text-xs font-medium rounded transition-all duration-150 flex items-center justify-center gap-2 bg-primary text-background hover:bg-warm-darker disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <><Loader2 size={12} className="animate-spin" /> {t('creating')}</>
                  ) : (
                    <><Send size={12} /> {t('createOrder')}</>
                  )}
                </button>
              )}
            </div>

            {ordine.mostraBudget && budget != null && (
              <div className="px-4 pt-3 pb-0 border-t border-border bg-cream/20">
                <div className="flex justify-between text-2xs text-gray-400 mb-1">
                  <span className="uppercase tracking-wide">{ts('budgetChannel')}</span>
                  <span className="font-semibold text-primary">{formatCurrency(budget)}</span>
                </div>
                <div className="flex justify-between text-2xs text-gray-400 mb-1.5">
                  {ordine.mostraCosto && (
                    <span>{ts('budgetUsed')}: <span className="font-medium text-primary">{formatCurrency(costTotal)}</span></span>
                  )}
                  {ordine.mostraRimanente && (
                    <span>{ts('budgetRemaining')}: <span className={`font-medium ${budgetRemaining! < 0 ? 'text-red-500' : 'text-primary'}`}>{formatCurrency(budgetRemaining ?? 0)}</span></span>
                  )}
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-2">
                  <div
                    className={`h-full rounded-full transition-all ${barColor}`}
                    style={{ width: `${Math.min(budgetPct, 100)}%` }}
                  />
                </div>
                {budgetPct > 100 && (
                  <div className="text-2xs text-red-500 font-medium mb-1">
                    {ts('budgetExceeded', { amount: formatCurrency(costTotal - budget) })}
                  </div>
                )}
                {budgetPct > 90 && budgetPct <= 100 && (
                  <div className="text-2xs text-orange-500 font-medium mb-1">
                    {ts('budgetWarning')}
                  </div>
                )}
              </div>
            )}

            <CartSummary />

            {suggestions.length > 0 && (
              <div className="px-4 pb-3 border-t border-border/60">
                <p className="text-2xs text-gray-400 uppercase tracking-wider mt-3 mb-2">{ts('suggestions')}</p>
                <div className="space-y-2">
                  {suggestions.map((p) => (
                    <div key={p.id} className="flex items-center gap-2 bg-cream/50 rounded p-2">
                      <div className="w-10 h-10 flex-shrink-0 rounded bg-white overflow-hidden border border-border">
                        <ProductImage src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-2xs font-mono text-gray-400 truncate">{p.code}</p>
                        <p className="text-xs text-primary truncate leading-snug">{p.name}</p>
                        <p className="text-2xs text-gray-400">{formatCurrency(p.costPrice)}</p>
                      </div>
                      <button
                        onClick={() => setPendingProduct({ product: p as any, quantity: p.lotSize || 1 })}
                        className="flex-shrink-0 w-7 h-7 flex items-center justify-center bg-primary text-white rounded hover:bg-warm-darker transition-colors"
                      >
                        <ShoppingBag size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal unificato — stesso flusso di CustomerOrdersView */}
      {showCreateOrderModal && (
        <CreateOrderModal
          destinazioni={destinazioni}
          onClose={() => setShowCreateOrderModal(false)}
          onSubmit={async (canaleId, budget) => {
            setShowCreateOrderModal(false);
            await submitOrder(canaleId, budget);
          }}
          submitting={isSubmitting}
        />
      )}
    </>
  );
}
