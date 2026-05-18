'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Pencil, ScanEye, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCurrency, formatDate, getOrderStatusLabel, getOrderStatusColor } from '@/lib/utils';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import OrderDemetraExport from '@/components/orders/OrderDemetraExport';
import type { Order } from '@/types';

export default function CustomerOrdersView() {
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

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
      toast.success('Ordine eliminato');
      queryClient.invalidateQueries({ queryKey: ['my-orders'] });
    } catch (e: any) {
      toast.error(e.message ?? 'Impossibile eliminare l\'ordine');
    } finally {
      setDeletingId(null);
      setConfirmingId(null);
    }
  }

  if (isLoading) return <LoadingSpinner fullPage text="Caricamento ordini..." />;

  const list = orders ?? [];

  return (
    <div className="min-h-screen bg-cream">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-primary tracking-tight">I miei Ordini</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {list.length === 0
              ? 'Nessun ordine trovato'
              : `${list.length} ordine${list.length !== 1 ? 'i' : ''}`}
          </p>
        </div>

        {list.length === 0 && (
          <div className="text-center py-20">
            <p className="text-sm text-gray-400">Non hai ancora nessun ordine.</p>
            <Link href="/catalog" className="mt-3 inline-block text-sm text-accent hover:underline">
              Vai al catalogo →
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

                {/* Middle: stats */}
                <p className="text-xs text-gray-500">
                  {(order.items?.length ?? 0)} articoli
                  {' · '}
                  {order.totalItems} pezzi
                  {' · '}
                  {formatCurrency(order.totalValue)}
                </p>

                {/* Bottom: action buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Modifica */}
                  {!isExported && (
                    <Link
                      href={`/catalog/orders/${order.id}/preview`}
                      className="flex items-center gap-1 text-xs border border-border rounded px-2 py-1.5 text-gray-500 hover:text-primary hover:bg-cream transition-colors"
                    >
                      <Pencil size={11} />
                      <span className="hidden sm:inline">Modifica</span>
                    </Link>
                  )}

                  {/* Anteprima */}
                  <Link
                    href={`/catalog/orders/${order.id}/preview`}
                    className="flex items-center gap-1 text-xs border border-border rounded px-2 py-1.5 text-gray-500 hover:text-primary hover:bg-cream transition-colors"
                  >
                    <ScanEye size={11} />
                    <span className="hidden sm:inline">Anteprima</span>
                  </Link>

                  {/* Esporta (Demetra) */}
                  <OrderDemetraExport
                    order={order}
                    onExported={() => queryClient.invalidateQueries({ queryKey: ['my-orders'] })}
                  />

                  {/* Elimina */}
                  {!isExported && (
                    isConfirming ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-gray-500">
                          Sei sicuro? L&apos;ordine verrà eliminato definitivamente.
                        </span>
                        <button
                          onClick={() => handleDelete(order.id)}
                          disabled={isDeleting}
                          className="text-xs bg-red-500 text-white px-2 py-1.5 rounded hover:bg-red-600 transition-colors disabled:opacity-50"
                        >
                          {isDeleting ? 'Eliminando...' : 'Sì, elimina'}
                        </button>
                        <button
                          onClick={() => setConfirmingId(null)}
                          disabled={isDeleting}
                          className="text-xs border border-border rounded px-2 py-1.5 text-gray-500 hover:bg-cream transition-colors"
                        >
                          Annulla
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmingId(order.id)}
                        className="flex items-center gap-1 text-xs border border-red-200 rounded px-2 py-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={11} />
                        <span className="hidden sm:inline">Elimina</span>
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
