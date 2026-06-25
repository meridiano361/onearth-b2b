'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CalendarDays, Check, Copy, GitMerge, Layers, Loader2, Pencil, ScanEye, Search, Trash2, TrendingUp, Wallet, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import { useSession } from 'next-auth/react';
import { formatCurrency, formatDate, getOrderStatusLabel, getOrderStatusColor } from '@/lib/utils';
function orderProjections(order: Order) {
  let venditeII = 0;
  let venditeIE = 0;
  for (const item of order.items ?? []) {
    if (!item.product) continue;
    const retail = Number(item.product.retailPrice);
    const iva    = item.product.iva ?? 22;
    venditeII += retail * item.quantity;
    venditeIE += (retail * item.quantity) / (1 + iva / 100);
  }
  const cost     = Number(order.totalValue);
  const guadagno = venditeIE - cost;
  const margine  = venditeIE > 0 ? (guadagno / venditeIE) * 100 : 0;
  return { venditeII, guadagno, margine };
}
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import OrderDemetraExport from '@/components/orders/OrderDemetraExport';
import OrderExcelExport from '@/components/orders/OrderExcelExport';
import type { Order } from '@/types';
import { useSettings } from '@/contexts/SettingsContext';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';

const PREVIEW_SORT_KEY = 'preview-sort';
const SORT_OPTIONS = [
  { value: 'name-asc',     label: 'Nome A→Z' },
  { value: 'name-desc',    label: 'Nome Z→A' },
  { value: 'linea-asc',    label: 'Linea A→Z' },
  { value: 'linea-desc',   label: 'Linea Z→A' },
  { value: 'price-asc',    label: 'Prezzo ↑' },
  { value: 'price-desc',   label: 'Prezzo ↓' },
  { value: 'novita',       label: 'Novità' },
  { value: 'continuativi', label: 'Continuativi' },
];


export default function CustomerOrdersView() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const t = useTranslations('orders');
  const { ordine } = useSettings();
  const { data: session } = useSession();
  const isOperator = session?.user.role === 'OPERATOR';
  const { mondiEspositivi } = useFeatureFlags();

  const [budgetEditingOrderId, setBudgetEditingOrderId] = useState<string | null>(null);
  const [budgetEditInput, setBudgetEditInput] = useState('');
  const [savingBudget, setSavingBudget] = useState(false);

  async function handleSaveBudget(orderId: string) {
    const val = parseFloat(budgetEditInput);
    if (isNaN(val) || val <= 0) { toast.error('Inserisci un budget valido'); return; }
    setSavingBudget(true);
    try {
      const res = await fetch(`/api/catalog/orders/${orderId}/budget`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ budgetPersonalizzato: val }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || 'Errore');
      }
      toast.success('Budget aggiornato');
      queryClient.invalidateQueries({ queryKey: ['my-orders'] });
      setBudgetEditingOrderId(null);
    } catch (e: any) {
      toast.error(e.message || 'Errore');
    } finally {
      setSavingBudget(false);
    }
  }

  // ── Merge orders ──────────────────────────────────────────────
  const [mergeSelection, setMergeSelection] = useState<Set<string>>(new Set());
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [mergeTargetId, setMergeTargetId] = useState<string>('');
  const [merging, setMerging] = useState(false);

  function toggleMergeSelect(orderId: string) {
    setMergeSelection(prev => {
      const next = new Set(prev);
      if (next.has(orderId)) { next.delete(orderId); } else { next.add(orderId); }
      return next;
    });
  }

  function openMergeModal() {
    const [first] = Array.from(mergeSelection);
    setMergeTargetId(first);
    setShowMergeModal(true);
  }

  async function handleMerge() {
    const ids = Array.from(mergeSelection);
    const sourceId = ids.find(id => id !== mergeTargetId)!;
    if (!sourceId || !mergeTargetId) {
      toast.error('Seleziona i due ordini da unire');
      return;
    }
    setMerging(true);
    try {
      const res = await fetch('/api/orders/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceOrderId: sourceId, targetOrderId: mergeTargetId }),
      });

      // Parse response defensively — never call .json() on an empty or non-JSON body
      let body: { ok?: boolean; error?: string } | null = null;
      const ct = res.headers.get('content-type') ?? '';
      if (ct.includes('application/json')) {
        try { body = await res.json(); } catch { /* parsing failed, body stays null */ }
      } else {
        const raw = await res.text().catch(() => '');
        console.error('[merge] Risposta non-JSON dal server', res.status, raw.slice(0, 300));
      }

      if (!res.ok) {
        throw new Error(body?.error || `Errore del server (${res.status})`);
      }

      toast.success('Ordini uniti con successo');
      setShowMergeModal(false);
      setMergeSelection(new Set());
      queryClient.invalidateQueries({ queryKey: ['my-orders'] });
    } catch (e: any) {
      toast.error(e.message || 'Errore durante l\'unione degli ordini');
    } finally {
      setMerging(false);
    }
  }

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [productSort, setProductSort] = useState<string>(() =>
    typeof window !== 'undefined' ? (localStorage.getItem(PREVIEW_SORT_KEY) ?? 'name-asc') : 'name-asc'
  );
  function handleProductSortChange(v: string) { setProductSort(v); localStorage.setItem(PREVIEW_SORT_KEY, v); }
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [authCheckPending, setAuthCheckPending] = useState<{ orderId: string; action: 'edit' | 'delete' } | null>(null);

  function requiresAuthCheck(order: Order) {
    return isOperator && order.operatorId != null && order.operatorId !== session?.user?.id;
  }

  const { data: orders, isLoading } = useQuery<Order[]>({
    queryKey: ['my-orders'],
    queryFn: () =>
      fetch('/api/orders?my=true')
        .then((r) => r.json())
        .then((d) => d.data as Order[]),
  });

  async function handleDelete(orderId: string) {
    setDeletingId(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}`, { method: 'DELETE' });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? 'Errore');
      }
      toast.success(t('deleteSuccess'));
      queryClient.invalidateQueries({ queryKey: ['my-orders'] });
    } catch (e: any) {
      toast.error(e.message ?? 'Errore');
    } finally {
      setDeletingId(null);
      setConfirmingId(null);
    }
  }

  async function handleDuplicate(order: Order) {
    setDuplicatingId(order.id);
    try {
      const items = (order.items ?? []).map((i: any) => ({
        productId: i.productId,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
      }));
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? 'Errore');
      }
      const { data: newOrder } = await res.json();
      toast.success(t('duplicateSuccess'));
      queryClient.invalidateQueries({ queryKey: ['my-orders'] });
      router.push(`/catalog/orders/${newOrder.id}/preview`);
    } catch (e: any) {
      toast.error(e.message ?? 'Errore');
    } finally {
      setDuplicatingId(null);
    }
  }

  const [orderSearch, setOrderSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'exported'>('all');

  const list = orders ?? [];

  const filteredList = useMemo(() => {
    let result = list;
    if (statusFilter === 'active') result = result.filter(o => o.status !== 'ESPORTATO');
    if (statusFilter === 'exported') result = result.filter(o => o.status === 'ESPORTATO');
    if (orderSearch.trim()) {
      const q = orderSearch.toLowerCase();
      result = result.filter(o =>
        (o.orderNumber ?? o.id).toLowerCase().includes(q) ||
        (o.destinazione?.tipo ?? '').toLowerCase().includes(q) ||
        (o.destinazione?.citta ?? '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [list, statusFilter, orderSearch]);

  if (isLoading) return <LoadingSpinner fullPage text={t('loading')} />;

  return (
    <div className="min-h-screen bg-cream">
      {/* Merge modal */}
      {showMergeModal && (() => {
        const ids = Array.from(mergeSelection);
        const orderA = list.find(o => o.id === ids[0]);
        const orderB = list.find(o => o.id === ids[1]);
        if (!orderA || !orderB) return null;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-lg max-w-sm w-full p-5 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-primary flex items-center gap-2">
                  <GitMerge size={14} />
                  Unisci ordini
                </h2>
                <button onClick={() => setShowMergeModal(false)} className="text-gray-400 hover:text-primary">
                  <X size={16} />
                </button>
              </div>
              <p className="text-xs text-gray-500">
                Scegli quale ordine <strong>conservare</strong>. Il contenuto dell&apos;altro verrà aggiunto a questo, poi quell&apos;ordine sarà eliminato.
              </p>
              <div className="space-y-2">
                {[orderA, orderB].map(ord => (
                  <label
                    key={ord.id}
                    className={`flex items-start gap-3 border rounded p-3 cursor-pointer transition-colors ${mergeTargetId === ord.id ? 'border-primary bg-cream' : 'border-border hover:bg-cream/50'}`}
                  >
                    <input
                      type="radio"
                      name="mergeTarget"
                      value={ord.id}
                      checked={mergeTargetId === ord.id}
                      onChange={() => setMergeTargetId(ord.id)}
                      className="mt-0.5 accent-primary"
                    />
                    <div>
                      <p className="text-xs font-mono font-semibold text-primary">
                        {ord.orderNumber ?? `#${ord.id.slice(0, 8).toUpperCase()}`}
                      </p>
                      <p className="text-2xs text-gray-400">
                        {formatDate(ord.createdAt)} · {t('articles', { count: ord.items?.length ?? 0 })} · {ord.totalItems} {t('pieces')}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setShowMergeModal(false)}
                  disabled={merging}
                  className="flex-1 text-xs border border-border rounded px-3 py-2 text-gray-500 hover:bg-cream transition-colors"
                >
                  Annulla
                </button>
                <button
                  onClick={handleMerge}
                  disabled={merging || !mergeTargetId}
                  className="flex-1 text-xs bg-primary text-background rounded px-3 py-2 hover:bg-warm-darker transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {merging
                    ? <><Loader2 size={10} className="animate-spin" /> Unendo…</>
                    : <><GitMerge size={10} /> Unisci</>}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Auth check modal */}
      {authCheckPending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-lg max-w-sm w-full p-5 space-y-4 shadow-xl">
            <h2 className="text-sm font-semibold text-primary">
              Hai l&apos;autorizzazione per {authCheckPending.action === 'edit' ? 'modificare' : 'eliminare'} questo ordine?
            </h2>
            <p className="text-xs text-gray-500">
              Questo ordine è stato creato da un altro utente della tua organizzazione.
            </p>
            <div className="flex items-center justify-end gap-3 pt-1">
              <button
                onClick={() => setAuthCheckPending(null)}
                className="text-xs border border-border rounded px-3 py-2 text-gray-500 hover:bg-cream transition-colors"
              >
                No, annulla
              </button>
              <button
                onClick={() => {
                  const { orderId, action } = authCheckPending;
                  setAuthCheckPending(null);
                  if (action === 'edit') {
                    router.push(`/catalog/orders/${orderId}/preview`);
                  } else {
                    setConfirmingId(orderId);
                  }
                }}
                className="text-xs bg-primary text-background rounded px-3 py-2 hover:bg-warm-darker transition-colors"
              >
                Sì, procedi
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-primary tracking-tight">{t('title')}</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {list.length === 0
                ? t('noOrdersFound')
                : filteredList.length < list.length
                  ? `${filteredList.length} di ${list.length} ${list.length === 1 ? t('orderSingular') : t('orderPlural')}`
                  : `${list.length} ${list.length === 1 ? t('orderSingular') : t('orderPlural')}`}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <span className="text-2xs text-gray-400">Ordina prodotti</span>
            <select
              value={productSort}
              onChange={(e) => handleProductSortChange(e.target.value)}
              className="text-xs border border-border rounded px-2 py-1 bg-white text-primary focus:outline-none cursor-pointer"
            >
              {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        {/* Search + status filter */}
        {list.length > 0 && (
          <div className="mb-4 space-y-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={orderSearch}
                onChange={e => setOrderSearch(e.target.value)}
                placeholder="Cerca per numero ordine o destinazione…"
                className="w-full pl-9 pr-8 py-2 text-sm bg-white border border-border rounded-lg focus:outline-none focus:border-accent transition-colors"
              />
              {orderSearch && (
                <button
                  onClick={() => setOrderSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={13} />
                </button>
              )}
            </div>
            <div className="flex gap-1.5">
              {(['all', 'active', 'exported'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    statusFilter === f
                      ? 'bg-primary text-background border-primary'
                      : 'bg-white text-gray-500 border-border hover:bg-cream'
                  }`}
                >
                  {f === 'all' ? 'Tutti' : f === 'active' ? 'In lavorazione' : 'Esportati'}
                </button>
              ))}
            </div>
          </div>
        )}

        {list.length === 0 && (
          <div className="text-center py-20">
            <p className="text-sm text-gray-400">{t('noOrders')}</p>
            <Link href="/home" className="mt-3 inline-block text-sm text-accent hover:underline">
              {t('goCatalog')}
            </Link>
          </div>
        )}

        <div className="space-y-4">
          {filteredList.length === 0 && list.length > 0 && (
            <p className="text-center text-sm text-gray-400 py-8">Nessun ordine corrisponde alla ricerca.</p>
          )}
          {filteredList.map((order) => {
            const isExported = order.status === 'ESPORTATO';
            const isConfirming = confirmingId === order.id;
            const isDeleting = deletingId === order.id;

            return (
              <div
                key={order.id}
                className="bg-white border border-border rounded overflow-hidden"
              >
                {/* Card body */}
                <div className="p-3 sm:p-4 space-y-3">

                {/* Top row: checkbox + ID + date + status */}
                <div className="flex items-start justify-between gap-2 min-w-0">
                  <div className="flex items-start gap-2 min-w-0">
                    {!isExported && (
                      <input
                        type="checkbox"
                        checked={mergeSelection.has(order.id)}
                        onChange={() => toggleMergeSelect(order.id)}
                        className="mt-0.5 flex-shrink-0 cursor-pointer accent-primary"
                        title="Seleziona per unire"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-mono font-semibold text-primary tracking-widest truncate">
                        {order.orderNumber ?? `#${order.id.slice(0, 8).toUpperCase()}`}
                      </p>
                      <p className="text-2xs text-gray-400 mt-0.5">
                        {formatDate(order.createdAt)}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-2xs font-medium px-2 py-1 rounded flex-shrink-0 whitespace-nowrap ${getOrderStatusColor(order.status)}`}
                  >
                    {getOrderStatusLabel(order.status)}
                  </span>
                </div>

                {/* Middle: stats + destinazione */}
                <p className="text-xs text-gray-500">
                  {t('articles', { count: order.items?.length ?? 0 })}
                  {' · '}
                  {order.totalItems} {t('pieces')}
                </p>
                {order.destinazione && (
                  <p className="text-2xs text-gray-400 -mt-1 truncate">
                    {order.destinazione.tipo}{order.destinazione.citta ? ` · ${order.destinazione.citta}` : ''}
                  </p>
                )}

                {/* Projections */}
                {(() => {
                  const { venditeII, guadagno, margine } = orderProjections(order);
                  const budget = order.budgetPersonalizzato ?? null;
                  const cost = Number(order.totalValue);
                  const budgetPct = budget && budget > 0 ? (cost / budget) * 100 : 0;
                  const budgetRemaining = budget != null ? budget - cost : null;
                  const hasAnyField = ordine.mostraCosto || ordine.mostraVendite || ordine.mostraGuadagno || ordine.mostraMargine || (ordine.mostraBudget && budget != null);
                  if (!hasAnyField) return null;
                  return (
                    <div className="bg-cream/60 rounded p-2.5 space-y-1.5">
                      <div className="flex items-center gap-1 mb-0.5">
                        <TrendingUp size={10} className="text-gray-400" />
                        <span className="text-2xs text-gray-400 uppercase tracking-wide">Proiezioni</span>
                      </div>
                      {/* Each metric on its own flex row — values never overflow */}
                      <div className="space-y-0.5">
                        {ordine.mostraCosto && (
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="text-2xs text-gray-400 flex-shrink-0">Costo (i.e.)</span>
                            <span className="text-2xs font-medium text-primary tabular-nums">{formatCurrency(cost)}</span>
                          </div>
                        )}
                        {ordine.mostraVendite && (
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="text-2xs text-gray-400 flex-shrink-0">Vendite pot.</span>
                            <span className="text-2xs font-medium text-primary tabular-nums">{formatCurrency(venditeII)}</span>
                          </div>
                        )}
                        {ordine.mostraGuadagno && (
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="text-2xs text-gray-400 flex-shrink-0">Guadagno</span>
                            <span className={`text-2xs font-medium tabular-nums ${guadagno >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{formatCurrency(guadagno)}</span>
                          </div>
                        )}
                        {ordine.mostraMargine && (
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="text-2xs text-gray-400 flex-shrink-0">Margine</span>
                            <span className="text-2xs font-medium text-primary tabular-nums">{margine.toFixed(1)}%</span>
                          </div>
                        )}
                      </div>
                      {ordine.mostraBudget && budget != null && (
                        <>
                          <div className="h-px bg-border/40 my-1" />
                          <div className="flex items-baseline justify-between gap-2 text-2xs text-gray-400">
                            <span className="flex-shrink-0">Budget</span>
                            <div className="flex items-baseline gap-2 min-w-0">
                              <span className="text-primary font-medium tabular-nums">{formatCurrency(budget)}</span>
                              {ordine.mostraRimanente && budgetRemaining != null && (
                                <span className={`tabular-nums flex-shrink-0 ${budgetRemaining < 0 ? 'text-red-500 font-medium' : ''}`}>
                                  ({budgetRemaining >= 0 ? '+' : ''}{formatCurrency(budgetRemaining)})
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${budgetPct > 100 ? 'bg-red-400' : budgetPct > 90 ? 'bg-orange-400' : 'bg-emerald-400'}`}
                              style={{ width: `${Math.min(budgetPct, 100)}%` }}
                            />
                          </div>
                        </>
                      )}
                    </div>
                  );
                })()}

                {/* Bottom: action buttons */}
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  {/* Modifica */}
                  {!isExported && (
                    <button
                      onClick={() => {
                        if (requiresAuthCheck(order)) {
                          setAuthCheckPending({ orderId: order.id, action: 'edit' });
                        } else {
                          router.push(`/catalog/orders/${order.id}/preview`);
                        }
                      }}
                      className="flex items-center gap-1 text-xs border border-border rounded px-2 py-1.5 text-gray-500 hover:text-primary hover:bg-cream transition-colors"
                    >
                      <Pencil size={11} />
                      <span className="hidden sm:inline">{t('edit')}</span>
                    </button>
                  )}

                  {/* Budget */}
                  {budgetEditingOrderId === order.id ? (
                    <div className="flex items-center gap-1.5">
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">€</span>
                        <input
                          type="number"
                          min="0"
                          step="100"
                          value={budgetEditInput}
                          onChange={e => setBudgetEditInput(e.target.value)}
                          autoFocus
                          className="w-24 pl-5 pr-2 py-1.5 text-xs border border-border rounded focus:outline-none focus:border-accent text-primary"
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleSaveBudget(order.id);
                            if (e.key === 'Escape') setBudgetEditingOrderId(null);
                          }}
                        />
                      </div>
                      <button
                        onClick={() => handleSaveBudget(order.id)}
                        disabled={savingBudget}
                        className="text-xs bg-primary text-background rounded px-2 py-1.5 hover:bg-warm-darker transition-colors disabled:opacity-50 flex items-center gap-1"
                      >
                        {savingBudget ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />}
                      </button>
                      <button
                        onClick={() => setBudgetEditingOrderId(null)}
                        disabled={savingBudget}
                        className="text-xs border border-border rounded px-2 py-1.5 text-gray-400 hover:text-primary hover:bg-cream transition-colors"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        if (requiresAuthCheck(order)) {
                          setAuthCheckPending({ orderId: order.id, action: 'edit' });
                        } else {
                          setBudgetEditingOrderId(order.id);
                          setBudgetEditInput(String(order.budgetPersonalizzato ?? ''));
                        }
                      }}
                      className="flex items-center gap-1 text-xs border border-border rounded px-2 py-1.5 text-gray-500 hover:text-primary hover:bg-cream transition-colors"
                    >
                      <Wallet size={11} />
                      <span>Budget</span>
                    </button>
                  )}

                  {/* Anteprima */}
                  <button
                    onClick={() => router.push(`/catalog/orders/${order.id}/preview`)}
                    className="flex items-center gap-1 text-xs border border-border rounded px-2 py-1.5 text-gray-500 hover:text-primary hover:bg-cream transition-colors"
                  >
                    <ScanEye size={11} />
                    <span className="hidden sm:inline">{t('preview')}</span>
                  </button>

                  {/* Esporta (Demetra) */}
                  <OrderDemetraExport
                    order={order}
                    onExported={() => queryClient.invalidateQueries({ queryKey: ['my-orders'] })}
                  />

                  {/* Esporta Excel completo */}
                  <OrderExcelExport orderId={order.id} />

                  {/* Duplica — solo per ordini esportati */}
                  {isExported && (
                    <button
                      onClick={() => handleDuplicate(order)}
                      disabled={duplicatingId === order.id}
                      className="flex items-center gap-1 text-xs border border-border rounded px-2 py-1.5 text-gray-500 hover:text-primary hover:bg-cream transition-colors disabled:opacity-50"
                    >
                      <Copy size={11} />
                      <span className="hidden sm:inline">
                        {duplicatingId === order.id ? t('duplicating') : t('duplicateOrder')}
                      </span>
                    </button>
                  )}

                  {/* Mondi Espositivi / Calendario */}
                  {mondiEspositivi && (
                    <>
                      <button
                        onClick={() => router.push(`/catalog/orders/${order.id}/preview?tab=esposizione`)}
                        className="flex items-center gap-1 text-xs border border-border rounded px-2 py-1.5 text-gray-500 hover:text-primary hover:bg-cream transition-colors"
                        title="Esposizione"
                      >
                        <Layers size={11} />
                        <span className="hidden sm:inline">Esposizione</span>
                      </button>
                      <button
                        onClick={() => router.push(`/catalog/orders/${order.id}/preview?tab=calendario`)}
                        className="flex items-center gap-1 text-xs border border-border rounded px-2 py-1.5 text-gray-500 hover:text-primary hover:bg-cream transition-colors"
                        title="Calendario Esposizione"
                      >
                        <CalendarDays size={11} />
                        <span className="hidden sm:inline">Calendario</span>
                      </button>
                    </>
                  )}

                  {/* Elimina */}
                  {isConfirming ? (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-gray-500">
                        {t('deleteConfirm')}
                      </span>
                      <button
                        onClick={() => handleDelete(order.id)}
                        disabled={isDeleting}
                        className="text-xs bg-red-500 text-white px-2 py-1.5 rounded hover:bg-red-600 transition-colors disabled:opacity-50"
                      >
                        {isDeleting ? t('deleting') : t('deleteYes')}
                      </button>
                      <button
                        onClick={() => setConfirmingId(null)}
                        disabled={isDeleting}
                        className="text-xs border border-border rounded px-2 py-1.5 text-gray-500 hover:bg-cream transition-colors"
                      >
                        {t('cancel')}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        if (requiresAuthCheck(order)) {
                          setAuthCheckPending({ orderId: order.id, action: 'delete' });
                        } else {
                          setConfirmingId(order.id);
                        }
                      }}
                      className="flex items-center gap-1 text-xs border border-red-200 rounded px-2 py-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={11} />
                      <span className="hidden sm:inline">{t('delete')}</span>
                    </button>
                  )}
                </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Floating merge bar */}
      {mergeSelection.size > 0 && (
        <div className="fixed above-mobile-nav md:bottom-6 left-1/2 -translate-x-1/2 z-50 bg-primary text-background rounded-full px-5 py-3 shadow-xl flex items-center gap-3">
          <GitMerge size={14} />
          <span className="text-sm font-medium">{mergeSelection.size} ordini selezionati</span>
          {mergeSelection.size === 2 && (
            <button
              onClick={openMergeModal}
              className="bg-background text-primary text-xs font-semibold rounded-full px-3 py-1.5 hover:bg-cream transition-colors"
            >
              Unisci
            </button>
          )}
          <button
            onClick={() => setMergeSelection(new Set())}
            className="text-background/70 hover:text-background transition-colors ml-1"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
