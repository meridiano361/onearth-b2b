'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import { ShoppingCart, Trash2, AlertTriangle, Send, Loader2, ShoppingBag, MapPin, Plus } from 'lucide-react';
import { ProductImage } from '@/components/ui/ProductImage';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import { formatCurrency } from '@/lib/utils';
import { useCartStore } from '@/store/cartStore';
import { usePreview } from '@/contexts/PreviewContext';
import { useSettings } from '@/contexts/SettingsContext';
import { computeProjections } from './CartSummary';
import CartItem from './CartItem';
import CartSummary from './CartSummary';
import type { Destinazione, Product } from '@/types';

type SuggestionProduct = Pick<Product, 'id' | 'code' | 'name' | 'imageUrl' | 'costPrice' | 'retailPrice' | 'lotSize' | 'iva'>;

export default function CartSidebar() {
  const router = useRouter();
  const { data: session } = useSession();
  const preview = usePreview();
  const { ordine } = useSettings();
  const { items, collectionId, notes, clearCart, removeItem, getTotalItems, hasLotWarnings, addItem } = useCartStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [destinazioni, setDestinazioni] = useState<Destinazione[]>([]);
  const [showDestinazioneModal, setShowDestinazioneModal] = useState(false);
  const [selectedDestinazioneId, setSelectedDestinazioneId] = useState('');
  const [showCreateDestModal, setShowCreateDestModal] = useState(false);
  const [createDestForm, setCreateDestForm] = useState<{ tipo: string; citta: string; indirizzo: string; budget: string }>({ tipo: 'BOTTEGA', citta: '', indirizzo: '', budget: '' });
  const [creatingDest, setCreatingDest] = useState(false);
  const t = useTranslations('cart');
  const ts = useTranslations('cartSummary');

  const totalItems = getTotalItems();
  const hasWarnings = hasLotWarnings();
  const isEmpty = items.length === 0;
  const isOperator = session?.user.role === 'OPERATOR';

  useEffect(() => {
    if (preview) {
      // In preview mode, fetch destinazioni for the simulated org via the catalog API
      fetch('/api/catalog/destinazioni')
        .then((r) => r.json())
        .then((d) => {
          const list: Destinazione[] = d.data || [];
          setDestinazioni(list);
          if (list.length >= 1) setSelectedDestinazioneId(list[0].id);
        })
        .catch(() => {});
    } else if (isOperator) {
      fetch('/api/catalog/destinazioni')
        .then((r) => r.json())
        .then((d) => {
          const list: Destinazione[] = d.data || [];
          setDestinazioni(list);
          if (list.length >= 1) setSelectedDestinazioneId(list[0].id);
        })
        .catch(() => {});
    }
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

  // Budget calculations
  const selectedCanale = useMemo(
    () => destinazioni.find((c) => c.id === selectedDestinazioneId),
    [destinazioni, selectedDestinazioneId]
  );
  const budget = selectedCanale?.budget ?? null;
  const { costTotal } = useMemo(() => computeProjections(items), [items]);
  const budgetPct = budget && budget > 0 ? (costTotal / budget) * 100 : 0;
  const budgetRemaining = budget != null ? budget - costTotal : null;

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
            unitPrice: Number(i.product.costPrice),
          })),
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        // Se ci sono prodotti mancanti, rimuovili dal carrello
        if (body.missing?.length) {
          body.missing.forEach((id: string) => removeItem(id));
        }
        throw new Error(body.error ?? t('errorCreate'));
      }
      clearCart();
      toast.success('Ordine creato con successo');
      router.push('/catalog/orders');
    } catch (e: any) {
      toast.error(e.message ?? t('errorCreate'));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCreateDestinazioneAndOrder() {
    setCreatingDest(true);
    try {
      const res = await fetch('/api/catalog/destinazioni', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: createDestForm.tipo,
          citta: createDestForm.citta.trim() || null,
          indirizzo: createDestForm.indirizzo.trim() || null,
          budget: createDestForm.budget.trim() ? parseFloat(createDestForm.budget) : null,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Errore');
      const { data: newDest } = await res.json();
      setShowCreateDestModal(false);
      setDestinazioni([newDest]);
      await submitOrder(newDest.id);
    } catch (e: any) {
      toast.error(e.message || 'Errore nella creazione della destinazione');
    } finally {
      setCreatingDest(false);
    }
  }

  async function handleCreateOrder() {
    if (isSubmitting || isEmpty) return;
    if (isOperator) {
      if (destinazioni.length === 0) {
        setShowCreateDestModal(true);
        return;
      } else if (destinazioni.length === 1) {
        await submitOrder(destinazioni[0].id);
      } else {
        setShowDestinazioneModal(true);
      }
    } else {
      await submitOrder(undefined);
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
              onClick={() => { if (confirm(t('clearConfirm'))) clearCart(); }}
              className="text-gray-300 hover:text-gray-600 transition-colors"
              title={t('clearTooltip')}
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>

        {/* Crea Ordine — subito sotto l'header */}
        {!isEmpty && (
          <div className="px-4 pt-3 pb-3 border-b border-border flex-shrink-0">
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
        )}

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

        {/* Summary, budget, suggestions and actions */}
        {!isEmpty && (
          <>
            {/* Budget section */}
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
                {/* Progress bar */}
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

            {/* Product suggestions */}
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
                        onClick={() => addItem(p as any, p.lotSize || 1)}
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

      {/* Create first destinazione modal — non-dismissible */}
      {showCreateDestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-white rounded-lg shadow-2xl w-full max-w-sm p-6 z-10">
            <div className="flex items-center gap-2 mb-1">
              <MapPin size={14} className="text-accent flex-shrink-0" />
              <h3 className="text-sm font-semibold text-primary tracking-wide">Attiva una destinazione</h3>
            </div>
            <p className="text-xs text-gray-400 mb-4">Per creare un ordine devi prima attivare una destinazione (punto vendita).</p>
            <div className="space-y-3 mb-4">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block uppercase tracking-wide">Tipo *</label>
                <select
                  value={createDestForm.tipo}
                  onChange={(e) => setCreateDestForm((f) => ({ ...f, tipo: e.target.value }))}
                  className="w-full px-3 py-2 bg-white border border-border rounded text-sm text-primary focus:outline-none focus:border-accent"
                >
                  <option value="BOTTEGA">Bottega</option>
                  <option value="EMPORIO">Emporio</option>
                  <option value="DISTRETTO">Distretto</option>
                  <option value="STORE">Store</option>
                  <option value="OUTLET">Outlet</option>
                  <option value="TENDONE">Tendone</option>
                  <option value="FIERA">Fiera</option>
                  <option value="ONLINE">Online</option>
                  <option value="ALTRO">Altro</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Città <span className="text-gray-300">(opzionale)</span></label>
                <input
                  type="text"
                  value={createDestForm.citta}
                  onChange={(e) => setCreateDestForm((f) => ({ ...f, citta: e.target.value }))}
                  placeholder="es. Milano"
                  className="w-full px-3 py-2 bg-white border border-border rounded text-sm text-primary focus:outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Indirizzo <span className="text-gray-300">(opzionale)</span></label>
                <input
                  type="text"
                  value={createDestForm.indirizzo}
                  onChange={(e) => setCreateDestForm((f) => ({ ...f, indirizzo: e.target.value }))}
                  placeholder="es. Via Roma 10"
                  className="w-full px-3 py-2 bg-white border border-border rounded text-sm text-primary focus:outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Budget acquisto € <span className="text-gray-300">(opzionale)</span></label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">€</span>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={createDestForm.budget}
                    onChange={(e) => setCreateDestForm((f) => ({ ...f, budget: e.target.value }))}
                    placeholder="es. 5000"
                    className="w-full pl-7 pr-3 py-2 bg-white border border-border rounded text-sm text-primary focus:outline-none focus:border-accent"
                  />
                </div>
              </div>
            </div>
            <button
              onClick={handleCreateDestinazioneAndOrder}
              disabled={creatingDest}
              className="w-full py-2.5 text-xs font-medium rounded bg-primary text-background hover:bg-warm-darker transition-colors flex items-center justify-center gap-1.5 disabled:opacity-60"
            >
              {creatingDest ? <><Loader2 size={11} className="animate-spin" /> Creazione in corso…</> : <><Plus size={11} /> Crea destinazione e continua</>}
            </button>
          </div>
        </div>
      )}

      {/* Destinazione selection modal — non-dismissible */}
      {showDestinazioneModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-white rounded-lg shadow-2xl w-full max-w-sm p-6 z-10">
            <h3 className="text-sm font-semibold text-primary mb-1 tracking-wide">{t('selectCanaleTitle')}</h3>
            <p className="text-xs text-gray-400 mb-4">{t('selectCanalePlaceholder')}</p>
            <select
              value={selectedDestinazioneId}
              onChange={(e) => setSelectedDestinazioneId(e.target.value)}
              className="w-full px-4 py-2.5 bg-white border border-border rounded text-sm text-primary focus:outline-none focus:border-accent mb-4"
            >
              {destinazioni.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nome || d.tipo}{d.citta ? ` — ${d.citta}` : ''}
                </option>
              ))}
            </select>
            <button
              onClick={() => { setShowDestinazioneModal(false); submitOrder(selectedDestinazioneId || undefined); }}
              disabled={isSubmitting || !selectedDestinazioneId}
              className="w-full py-2.5 text-xs font-medium rounded bg-primary text-background hover:bg-warm-darker transition-colors flex items-center justify-center gap-1.5 disabled:opacity-60"
            >
              <Send size={11} />
              {t('selectCanaleConfirm')}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
