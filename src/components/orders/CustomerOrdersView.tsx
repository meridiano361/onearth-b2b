'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Copy, Pencil, ScanEye, Trash2, TrendingUp } from 'lucide-react';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
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
import type { Order } from '@/types';

export default function CustomerOrdersView() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const t = useTranslations('orders');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);

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

  if (isLoading) return <LoadingSpinner fullPage text={t('loading')} />;

  const list = orders ?? [];

  return (
    <div className="min-h-screen bg-cream">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-primary tracking-tight">{t('title')}</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {list.length === 0
              ? t('noOrdersFound')
              : `${list.length} ${list.length === 1 ? t('orderSingular') : t('orderPlural')}`}
          </p>
        </div>

        {list.length === 0 && (
          <div className="text-center py-20">
            <p className="text-sm text-gray-400">{t('noOrders')}</p>
            <Link href="/catalog" className="mt-3 inline-block text-sm text-accent hover:underline">
              {t('goCatalog')}
            </Link>
          </div>
        )}

        <div className="space-y-4">
          {list.map((order) => {
            const isExported = order.status === 'ESPORTATO';
            const isConfirming = confirmingId === order.id;
            const isDeleting = deletingId === order.id;

            return (
              <div
                key={order.id}
                className="bg-white border border-border rounded p-4 space-y-3"
              >
                {/* Top row: ID + date + status */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-mono font-semibold text-primary tracking-widest">
                      #{order.id.slice(0, 8).toUpperCase()}
                    </p>
                    <p className="text-2xs text-gray-400 mt-0.5">
                      {formatDate(order.createdAt)}
                    </p>
                  </div>
                  <span
                    className={`text-2xs font-medium px-2 py-1 rounded flex-shrink-0 ${getOrderStatusColor(order.status)}`}
                  >
                    {getOrderStatusLabel(order.status)}
                  </span>
                </div>

                {/* Middle: stats + canale */}
                <p className="text-xs text-gray-500">
                  {t('articles', { count: order.items?.length ?? 0 })}
                  {' · '}
                  {order.totalItems} {t('pieces')}
                </p>
                {order.canale && (
                  <p className="text-2xs text-gray-400 -mt-1">
                    {order.canale.tipo}{order.canale.citta ? ` · ${order.canale.citta}` : ''}
                  </p>
                )}

                {/* Projections */}
                {(() => {
                  const { venditeII, guadagno, margine } = orderProjections(order);
                  const budget = order.canale?.budget;
                  const cost = Number(order.totalValue);
                  const budgetPct = budget && budget > 0 ? (cost / budget) * 100 : 0;
                  return (
                    <div className="bg-cream/60 rounded p-2.5 space-y-1">
                      <div className="flex items-center gap-1 mb-1">
                        <TrendingUp size={10} className="text-gray-400" />
                        <span className="text-2xs text-gray-400 uppercase tracking-wide">Proiezioni</span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-2xs">
                        <span className="text-gray-400">Costo</span>
                        <span className="font-medium text-primary text-right">{formatCurrency(cost)}</span>
                        <span className="text-gray-400">Vendite pot. (i.i.)</span>
                        <span className="font-medium text-primary text-right">{formatCurrency(venditeII)}</span>
                        <span className="text-gray-400">Guadagno</span>
                        <span className={`font-medium text-right ${guadagno >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{formatCurrency(guadagno)}</span>
                        <span className="text-gray-400">Margine</span>
                        <span className="font-medium text-primary text-right">{margine.toFixed(1)}%</span>
                      </div>
                      {budget != null && (
                        <>
                          <div className="h-px bg-border/40 my-1" />
                          <div className="flex justify-between text-2xs text-gray-400">
                            <span>Budget canale: <span className="text-primary">{formatCurrency(budget)}</span></span>
                            <span className={budgetPct > 100 ? 'text-red-500 font-medium' : ''}>{budgetPct.toFixed(0)}%</span>
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
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Modifica */}
                  {!isExported && (
                    <Link
                      href={`/catalog/orders/${order.id}/preview`}
                      className="flex items-center gap-1 text-xs border border-border rounded px-2 py-1.5 text-gray-500 hover:text-primary hover:bg-cream transition-colors"
                    >
                      <Pencil size={11} />
                      <span className="hidden sm:inline">{t('edit')}</span>
                    </Link>
                  )}

                  {/* Anteprima */}
                  <Link
                    href={`/catalog/orders/${order.id}/preview`}
                    className="flex items-center gap-1 text-xs border border-border rounded px-2 py-1.5 text-gray-500 hover:text-primary hover:bg-cream transition-colors"
                  >
                    <ScanEye size={11} />
                    <span className="hidden sm:inline">{t('preview')}</span>
                  </Link>

                  {/* Esporta (Demetra) */}
                  <OrderDemetraExport
                    order={order}
                    onExported={() => queryClient.invalidateQueries({ queryKey: ['my-orders'] })}
                  />

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

                  {/* Elimina */}
                  {!isExported && (
                    isConfirming ? (
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
                        onClick={() => setConfirmingId(order.id)}
                        className="flex items-center gap-1 text-xs border border-red-200 rounded px-2 py-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={11} />
                        <span className="hidden sm:inline">{t('delete')}</span>
                      </button>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
