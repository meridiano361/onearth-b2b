'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ShoppingCart, Trash2, AlertTriangle, Send, Loader2, ShoppingBag, Plus, ArrowLeftRight, Check } from 'lucide-react';
import Link from 'next/link';
import { ProductImage } from '@/components/ui/ProductImage';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import { formatCurrency } from '@/lib/utils';
import { useCartStore } from '@/store/cartStore';
import { usePreview } from '@/contexts/PreviewContext';
import { useSettings } from '@/contexts/SettingsContext';
import { computeProjections } from './CartSummary';
import CartItem from './CartItem';
import { useCollectionRoutes } from '@/hooks/useCollectionRoutes';
import type { Destinazione, Product } from '@/types';

type SuggestionProduct = Pick<Product, 'id' | 'code' | 'name' | 'imageUrl' | 'costPrice' | 'retailPrice' | 'lotSize' | 'iva'>;

export default function CartSidebar() {
  const router = useRouter();
  const { data: session } = useSession();
  const preview = usePreview();
  const { ordine } = useSettings();
  const routes = useCollectionRoutes();
  const {
    items, cartId, cartName,
    canaleId, budgetPersonalizzato, canale,
    clearCart, getTotalItems, getTotalLines, hasLotWarnings,
    setPendingProduct, setShowCartPicker, setCartDestination,
  } = useCartStore();
  const queryClient = useQueryClient();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingDest, setEditingDest] = useState(false);
  const [editCanaleId, setEditCanaleId] = useState('');
  const [editBudgetChoice, setEditBudgetChoice] = useState<'dest' | 'custom' | null>(null);
  const [editBudgetCustom, setEditBudgetCustom] = useState('');
  const [savingDest, setSavingDest] = useState(false);

  const t = useTranslations('cart');
  const ts = useTranslations('cartSummary');

  const totalItems = getTotalItems();
  const totalLines = getTotalLines();
  const hasWarnings = hasLotWarnings();
  const isEmpty = items.length === 0;
  const isOperator = session?.user.role === 'OPERATOR';

  const { data: destinazioni = [] } = useQuery<Destinazione[]>({
    queryKey: ['destinazioni'],
    queryFn: () => fetch('/api/catalog/destinazioni').then(r => r.json()).then(d => d.data ?? []),
    enabled: isOperator,
  });

  const productIds = items.map((i) => i.productId).join(',');
  const { data: suggestionsData } = useQuery<{ data: SuggestionProduct[] }>({
    queryKey: ['suggestions', productIds],
    queryFn: () => fetch(`/api/catalog/suggestions?productIds=${productIds}`).then((r) => r.json()),
    enabled: items.length > 0,
    staleTime: 1000 * 60,
  });
  const suggestions = suggestionsData?.data ?? [];

  const budget = budgetPersonalizzato;
  const { costTotal, venditeII, margine } = useMemo(() => computeProjections(items), [items]);
  const budgetPct = budget && budget > 0 ? (costTotal / budget) * 100 : 0;
  const budgetRemaining = budget != null ? budget - costTotal : null;

  const editDest = destinazioni.find(d => d.id === editCanaleId) ?? null;
  const editDestBudget = editDest?.budget ?? null;

  function openEditDest() {
    setEditCanaleId(canaleId ?? '');
    setEditBudgetCustom(budgetPersonalizzato != null ? String(budgetPersonalizzato) : '');
    setEditBudgetChoice(null);
    setEditingDest(true);
  }

  async function handleSaveDest() {
    if (!cartId || !editCanaleId) return;
    let budgetFinal: number | null = null;
    if (editBudgetChoice === 'dest' && editDestBudget != null) {
      budgetFinal = editDestBudget;
    } else {
      const parsed = parseFloat(editBudgetCustom);
      budgetFinal = !isNaN(parsed) && parsed > 0 ? parsed : null;
    }
    setSavingDest(true);
    try {
      const res = await fetch(`/api/catalog/carts/${cartId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ canaleId: editCanaleId, budgetPersonalizzato: budgetFinal }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Errore');
      setCartDestination(editCanaleId, budgetFinal, editDest);
      setEditingDest(false);
      toast.success('Destinazione aggiornata');
    } catch (e: any) {
      toast.error(e.message ?? 'Errore');
    } finally {
      setSavingDest(false);
    }
  }

  async function submitOrder() {
    if (!cartId) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/catalog/carts/${cartId}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
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

  const barColor =
    budgetPct > 100 ? 'bg-red-500' :
    budgetPct > 90  ? 'bg-orange-400' :
    budgetPct > 70  ? 'bg-yellow-400' :
    'bg-emerald-500';

  const showMetrics = !!cartId && (!isEmpty || (budget != null && ordine.mostraBudget));

  return (
    <div className="flex flex-col h-full">

      {/* ── 1. HEADER ──────────────────────────────────────────────── */}
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

      {/* ── 2. DESTINAZIONE (operators only) ───────────────────────── */}
      {isOperator && cartId && (
        <div className="px-4 py-2.5 border-b border-border bg-cream/20 flex-shrink-0">
          {!editingDest ? (
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-2xs text-gray-400 uppercase tracking-wide mb-0.5">Destinazione</p>
                {canale ? (
                  <p className="text-xs text-primary font-medium truncate">
                    {canale.nome || canale.tipo}{canale.citta ? ` · ${canale.citta}` : ''}
                  </p>
                ) : (
                  <p className="text-xs text-gray-400 italic">Non impostata</p>
                )}
              </div>
              <button onClick={openEditDest} className="text-2xs text-accent hover:underline flex-shrink-0 mt-1">
                {canale ? 'Modifica' : 'Imposta'}
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <select
                value={editCanaleId}
                onChange={e => { setEditCanaleId(e.target.value); setEditBudgetChoice(null); setEditBudgetCustom(''); }}
                className="w-full h-8 border border-border rounded px-2 text-xs text-primary focus:outline-none focus:ring-1 focus:ring-accent bg-white"
                autoFocus
              >
                <option value="">— Scegli destinazione —</option>
                {destinazioni.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.nome || d.tipo}{d.citta ? ` — ${d.citta}` : ''}
                  </option>
                ))}
              </select>

              {editCanaleId && editDestBudget != null ? (
                <div className="space-y-1">
                  <label className={`flex items-center gap-2 border rounded p-1.5 cursor-pointer text-xs transition-colors ${editBudgetChoice === 'dest' ? 'border-accent bg-accent/5' : 'border-border hover:bg-cream/50'}`}>
                    <input type="radio" name="editBudget" checked={editBudgetChoice === 'dest'} onChange={() => { setEditBudgetChoice('dest'); setEditBudgetCustom(String(editDestBudget)); }} className="accent-primary" />
                    Budget dest: <strong>{formatCurrency(editDestBudget)}</strong>
                  </label>
                  <label className={`flex items-center gap-2 border rounded p-1.5 cursor-pointer text-xs transition-colors ${editBudgetChoice === 'custom' ? 'border-accent bg-accent/5' : 'border-border hover:bg-cream/50'}`}>
                    <input type="radio" name="editBudget" checked={editBudgetChoice === 'custom'} onChange={() => setEditBudgetChoice('custom')} className="accent-primary" />
                    <div className="relative flex-1" onClick={e => e.stopPropagation()}>
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-2xs">€</span>
                      <input
                        type="number" min="0" step="100"
                        value={editBudgetChoice === 'custom' ? editBudgetCustom : ''}
                        onChange={e => { setEditBudgetCustom(e.target.value); setEditBudgetChoice('custom'); }}
                        onFocus={() => setEditBudgetChoice('custom')}
                        placeholder="Personalizzato"
                        className="w-full pl-5 pr-2 py-0.5 border border-border rounded text-xs text-primary focus:outline-none focus:border-accent bg-white"
                      />
                    </div>
                  </label>
                </div>
              ) : editCanaleId ? (
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">€</span>
                  <input
                    type="number" min="0" step="100"
                    value={editBudgetCustom}
                    onChange={e => setEditBudgetCustom(e.target.value)}
                    placeholder="Budget (opzionale)"
                    className="w-full pl-6 pr-2 h-7 border border-border rounded text-xs text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
              ) : null}

              <div className="flex gap-1.5">
                <button onClick={() => setEditingDest(false)} className="flex-1 py-1 text-xs border border-border rounded text-gray-500 hover:bg-cream">
                  Annulla
                </button>
                <button
                  onClick={handleSaveDest}
                  disabled={savingDest || !editCanaleId}
                  className="flex-1 py-1 text-xs bg-primary text-background rounded hover:bg-warm-darker disabled:opacity-50 flex items-center justify-center gap-1"
                >
                  {savingDest ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />}
                  Salva
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── 3. RIEPILOGO BUDGET / METRICHE ─────────────────────────── */}
      {showMetrics && (
        <div className="px-4 py-3 border-b border-border bg-cream/30 flex-shrink-0 space-y-1.5">

          {/* Budget + barra progresso */}
          {ordine.mostraBudget && budget != null && (
            <>
              <div className="flex justify-between text-2xs">
                <span className="text-gray-400 uppercase tracking-wide">{ts('budgetChannel')}</span>
                <span className="font-semibold text-primary">{formatCurrency(budget)}</span>
              </div>
              {ordine.mostraCosto && (
                <div className="flex justify-between text-2xs">
                  <span className="text-gray-400">{ts('budgetUsed')}</span>
                  <span className="font-medium text-primary">{formatCurrency(costTotal)}</span>
                </div>
              )}
              {ordine.mostraRimanente && (
                <div className="flex justify-between text-2xs">
                  <span className="text-gray-400">{ts('budgetRemaining')}</span>
                  <span className={`font-medium ${budgetRemaining! < 0 ? 'text-red-500' : 'text-primary'}`}>
                    {formatCurrency(budgetRemaining ?? 0)}
                  </span>
                </div>
              )}
              <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${barColor}`}
                  style={{ width: `${Math.min(budgetPct, 100)}%` }}
                />
              </div>
              {budgetPct > 100 && (
                <p className="text-2xs text-red-500 font-medium">{ts('budgetExceeded', { amount: formatCurrency(costTotal - budget) })}</p>
              )}
              {budgetPct > 90 && budgetPct <= 100 && (
                <p className="text-2xs text-orange-500 font-medium">{ts('budgetWarning')}</p>
              )}
              {!isEmpty && <div className="h-px bg-border/40 my-0.5" />}
            </>
          )}

          {/* Righe e pezzi */}
          {!isEmpty && (
            <div className="flex justify-between text-2xs text-gray-400">
              <span>{ts('lines')}: <span className="font-medium text-primary">{totalLines}</span></span>
              <span>{ts('totalPieces')}: <span className="font-medium text-primary">{totalItems}</span></span>
            </div>
          )}

          {/* Costo ordine */}
          {!isEmpty && ordine.mostraCosto && (
            <div className="flex justify-between text-2xs">
              <span className="text-gray-400 uppercase tracking-wide">{ts('costOrder')}</span>
              <span className="font-semibold text-primary">{formatCurrency(costTotal)}</span>
            </div>
          )}

          {/* Vendite potenziali */}
          {!isEmpty && ordine.mostraVendite && (
            <div className="flex justify-between text-2xs">
              <span className="text-gray-400 uppercase tracking-wide">{ts('potentialSales')}</span>
              <span className="font-medium text-primary">
                {formatCurrency(venditeII)} <span className="text-gray-400">(i.i.)</span>
              </span>
            </div>
          )}

          {/* Margine medio */}
          {!isEmpty && ordine.mostraMargine && (
            <div className="flex justify-between text-2xs">
              <span className="text-gray-400 uppercase tracking-wide">{ts('avgMargin')}</span>
              <span className="font-medium text-primary">{margine.toFixed(1)}%</span>
            </div>
          )}
        </div>
      )}

      {/* ── 4. BOTTONE "AGGIUNGI PRODOTTI" ─────────────────────────── */}
      {cartId && (
        <div className="px-4 py-3 border-b border-border flex-shrink-0">
          <Link
            href={routes.catalog}
            className="w-full py-2 text-xs font-semibold rounded bg-primary text-background flex items-center justify-center gap-1.5 hover:bg-warm-darker transition-colors"
          >
            <Plus size={12} /> Aggiungi prodotti
          </Link>
        </div>
      )}

      {/* ── 5. LISTA PRODOTTI + 6. SUGGERITI ───────────────────────── */}
      {isEmpty ? (
        <div className="flex-1 flex flex-col items-center justify-center py-12 px-4 text-center">
          <ShoppingCart size={32} className="text-gray-200 mb-3" />
          <p className="text-sm text-gray-400 font-light">{cartId ? t('emptyTitle') : 'Nessun carrello attivo'}</p>
          <p className="text-2xs text-gray-300 mt-1">
            {cartId ? t('emptyHint') : 'Vai in Carrelli per crearne uno'}
          </p>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto min-h-0">
            {/* Avviso lotti */}
            {hasWarnings && (
              <div className="mx-4 mt-3 mb-0 flex items-center gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded">
                <AlertTriangle size={13} className="text-amber-500 flex-shrink-0" />
                <p className="text-2xs text-amber-700">{t('lotWarning')}</p>
              </div>
            )}

            {/* Prodotti nel carrello */}
            {items.map((item) => (
              <CartItem key={item.productId + '||' + (item.taglia ?? '')} item={item} />
            ))}

            {/* Prodotti consigliati — sempre dopo i prodotti aggiunti */}
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
          </div>

          {/* ── 7. CREA ORDINE (pinnato in fondo) ─────────────────── */}
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
                onClick={async () => { if (!isSubmitting) await submitOrder(); }}
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
        </>
      )}
    </div>
  );
}
