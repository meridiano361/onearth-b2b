'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { formatCurrency, formatDate, getOrderStatusLabel } from '@/lib/utils';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import type { Order } from '@/types';
import toast from 'react-hot-toast';

const STATUS_FILTERS = [
  { value: '', label: 'Tutti' },
  { value: 'MERCE_DA_ORDINARE',       label: 'Da ordinare' },
  { value: 'MERCE_ORDINATA',          label: 'Ordinata' },
  { value: 'MERCE_PARZIALMENTE_PRONTA', label: 'Parz. pronta' },
  { value: 'MERCE_PRONTA_DA_AVVISARE', label: 'Pronta → da avvisare' },
  { value: 'MERCE_PRONTA_AVVISATO',   label: 'Pronta: avvisato' },
];

const STATUS_STYLE: Record<string, { badge: string; label: string }> = {
  MERCE_DA_ORDINARE:        { badge: 'bg-gray-100 text-gray-600',   label: 'Da ordinare' },
  MERCE_ORDINATA:           { badge: 'bg-blue-50 text-blue-700',    label: 'Ordinata' },
  MERCE_PARZIALMENTE_PRONTA:{ badge: 'bg-amber-50 text-amber-700',  label: 'Parz. pronta' },
  MERCE_PRONTA_DA_AVVISARE: { badge: 'bg-green-50 text-green-700',  label: 'Pronta - da avvisare' },
  MERCE_PRONTA_AVVISATO:    { badge: 'bg-green-100 text-green-800', label: 'Pronta - avvisato' },
};

const STATUS_OPTIONS = STATUS_FILTERS.slice(1).map((f) => f.value);

function OrderRow({ order, onStatusChange, onDelete }: { order: Order; onStatusChange: () => void; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const style = STATUS_STYLE[order.status] ?? { badge: 'bg-gray-100 text-gray-500', label: order.status };

  async function handleStatusChange(newStatus: string) {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed');
      onStatusChange();
      toast.success('Stato aggiornato');
    } catch {
      toast.error('Impossibile aggiornare lo stato');
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleDelete() {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/orders/${order.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
      toast.success('Ordine eliminato');
      onDelete();
    } catch {
      toast.error('Impossibile eliminare l\'ordine');
      setConfirmDelete(false);
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleExport(type: 'excel' | 'pdf') {
    try {
      const res = await fetch(`/api/export/${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id }),
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `order-${order.id.slice(0, 8)}.${type === 'excel' ? 'xlsx' : 'pdf'}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Esportazione fallita');
    }
  }

  return (
    <div className="border border-border rounded mb-2 overflow-hidden">
      <div
        className="flex items-start sm:items-center gap-3 px-4 sm:px-5 py-3.5 bg-white hover:bg-cream/30 cursor-pointer transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Status badge + info */}
        <div className="flex-1 min-w-0">
          <span className={`inline-block text-2xs font-semibold px-2 py-0.5 rounded mb-1 ${style.badge}`}>
            {style.label}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-primary truncate max-w-[200px] sm:max-w-none">
              {order.customer?.companyName}
            </span>
            <span className="text-2xs text-gray-400 font-mono">
              #{order.id.slice(0, 8).toUpperCase()}
            </span>
          </div>
          <p className="text-2xs text-gray-400 mt-0.5">
            {formatDate(order.createdAt, 'datetime')} · {order.totalItems} pz · {order.items?.length || 0} righe
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 flex-shrink-0">
          <span className="text-sm font-semibold text-primary">
            {formatCurrency(order.totalValue)}
          </span>
          <div className="flex items-center gap-2">
            <select
              value={order.status}
              onChange={(e) => { e.stopPropagation(); handleStatusChange(e.target.value); }}
              onClick={(e) => e.stopPropagation()}
              disabled={isUpdating}
              className="text-xs border border-border rounded px-2 py-1 focus:outline-none focus:border-accent bg-white"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{getOrderStatusLabel(s)}</option>
              ))}
            </select>
            <div className="flex gap-1">
              <button
                onClick={(e) => { e.stopPropagation(); handleExport('excel'); }}
                className="text-2xs px-2 py-1 border border-border rounded hover:bg-cream transition-colors text-gray-500"
              >XLS</button>
              <button
                onClick={(e) => { e.stopPropagation(); handleExport('pdf'); }}
                className="text-2xs px-2 py-1 border border-border rounded hover:bg-cream transition-colors text-gray-500"
              >PDF</button>
              {!confirmDelete ? (
                <button
                  onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); }}
                  title="Elimina ordine"
                  className="text-2xs px-2 py-1 border border-border rounded hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition-colors text-gray-400"
                >
                  <Trash2 size={11} />
                </button>
              ) : (
                <span className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="text-2xs px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors disabled:opacity-50"
                  >
                    {isDeleting ? '...' : 'Conferma'}
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="text-2xs px-2 py-1 border border-border rounded hover:bg-cream transition-colors text-gray-500"
                  >
                    Annulla
                  </button>
                </span>
              )}
            </div>
            {expanded ? <ChevronUp size={13} className="text-gray-400" /> : <ChevronDown size={13} className="text-gray-400" />}
          </div>
        </div>
      </div>

      {/* Expanded items */}
      {expanded && order.items && (
        <div className="border-t border-border bg-cream/20 px-4 sm:px-5 py-4">
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-xs min-w-[560px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left pb-2 text-2xs font-medium uppercase tracking-wide text-gray-400">Codice</th>
                  <th className="text-left pb-2 text-2xs font-medium uppercase tracking-wide text-gray-400">Prodotto</th>
                  <th className="text-right pb-2 text-2xs font-medium uppercase tracking-wide text-gray-400">Qtà ord.</th>
                  <th className="text-right pb-2 text-2xs font-medium uppercase tracking-wide text-gray-400 text-green-700">Merce pronta</th>
                  <th className="text-right pb-2 text-2xs font-medium uppercase tracking-wide text-gray-400">Unità</th>
                  <th className="text-right pb-2 text-2xs font-medium uppercase tracking-wide text-gray-400">Totale</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item) => (
                  <tr key={item.id} className="border-b border-border/40 last:border-0">
                    <td className="py-2 font-mono text-gray-400">{item.product?.code}</td>
                    <td className="py-2 text-primary">{item.product?.name}</td>
                    <td className="py-2 text-right font-medium">{item.quantity}</td>
                    <td className="py-2 text-right font-medium text-green-700">
                      {item.mercePronta > 0 ? item.mercePronta : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="py-2 text-right text-gray-500">{formatCurrency(item.unitPrice)}</td>
                    <td className="py-2 text-right font-medium">{formatCurrency(item.subtotal)}</td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={5} className="pt-3 text-right text-2xs font-medium text-gray-400 uppercase tracking-wide">
                    Totale Ordine
                  </td>
                  <td className="pt-3 text-right font-semibold text-primary">
                    {formatCurrency(order.totalValue)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Mobile card list */}
          <div className="sm:hidden space-y-2">
            {order.items.map((item) => (
              <div key={item.id} className="flex items-start justify-between bg-white rounded p-3 text-xs border border-border/50">
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-gray-400 text-2xs">{item.product?.code}</p>
                  <p className="font-medium text-primary leading-snug mt-0.5">{item.product?.name}</p>
                  <p className="text-gray-400 mt-0.5">{item.quantity} × {formatCurrency(item.unitPrice)}</p>
                  {item.mercePronta > 0 && (
                    <p className="text-green-700 font-medium mt-0.5">Pronta: {item.mercePronta}</p>
                  )}
                </div>
                <p className="font-semibold text-primary flex-shrink-0 ml-3">{formatCurrency(item.subtotal)}</p>
              </div>
            ))}
            <div className="flex justify-between items-center pt-2 border-t border-border">
              <span className="text-2xs font-medium uppercase tracking-wide text-gray-500">Totale Ordine</span>
              <span className="font-semibold text-primary">{formatCurrency(order.totalValue)}</span>
            </div>
          </div>

          {order.notes && (
            <div className="mt-3 pt-3 border-t border-border/50">
              <p className="text-2xs font-medium uppercase tracking-wide text-gray-400 mb-1">Note</p>
              <p className="text-xs text-gray-600 italic">{order.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminOrdersPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [searchCliente, setSearchCliente] = useState('');
  const [searchNumero, setSearchNumero] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-all-orders', statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '200' });
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`/api/orders?${params}`);
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  const orders: Order[] = (data?.data || []).filter((o: Order) => {
    if (searchCliente) {
      const q = searchCliente.toLowerCase();
      if (
        !o.customer?.companyName?.toLowerCase().includes(q) &&
        !o.customer?.customerCode?.toLowerCase().includes(q)
      ) return false;
    }
    if (searchNumero) {
      const q = searchNumero.toLowerCase();
      if (!o.id.toLowerCase().includes(q)) return false;
    }
    if (dateFrom) {
      if (new Date(o.createdAt) < new Date(dateFrom)) return false;
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      if (new Date(o.createdAt) > to) return false;
    }
    return true;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <p className="label-luxury text-accent mb-1">Admin</p>
          <h1 className="font-display text-2xl text-primary font-light">Ordini in corso</h1>
          <p className="text-sm text-gray-400 mt-0.5">{data?.total || 0} ordini totali</p>
        </div>
      </div>

      {/* Primary filter tabs */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors border ${
              statusFilter === f.value
                ? 'bg-primary text-white border-primary'
                : 'bg-white text-gray-500 border-border hover:border-gray-400 hover:text-primary'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Secondary filters */}
      <div className="flex flex-wrap gap-3 mb-6 p-4 bg-white border border-border rounded">
        <div className="flex-1 min-w-[160px]">
          <label className="block text-2xs font-medium uppercase tracking-wide text-gray-400 mb-1">Cliente</label>
          <input
            type="text"
            placeholder="Cerca cliente..."
            value={searchCliente}
            onChange={(e) => setSearchCliente(e.target.value)}
            className="w-full text-xs border border-border rounded px-3 py-1.5 focus:outline-none focus:border-accent"
          />
        </div>
        <div className="flex-1 min-w-[140px]">
          <label className="block text-2xs font-medium uppercase tracking-wide text-gray-400 mb-1">Numero ordine</label>
          <input
            type="text"
            placeholder="ID ordine..."
            value={searchNumero}
            onChange={(e) => setSearchNumero(e.target.value)}
            className="w-full text-xs border border-border rounded px-3 py-1.5 focus:outline-none focus:border-accent"
          />
        </div>
        <div className="flex-shrink-0">
          <label className="block text-2xs font-medium uppercase tracking-wide text-gray-400 mb-1">Data da</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="text-xs border border-border rounded px-3 py-1.5 focus:outline-none focus:border-accent"
          />
        </div>
        <div className="flex-shrink-0">
          <label className="block text-2xs font-medium uppercase tracking-wide text-gray-400 mb-1">Data a</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="text-xs border border-border rounded px-3 py-1.5 focus:outline-none focus:border-accent"
          />
        </div>
        {(searchCliente || searchNumero || dateFrom || dateTo) && (
          <div className="flex items-end">
            <button
              onClick={() => { setSearchCliente(''); setSearchNumero(''); setDateFrom(''); setDateTo(''); }}
              className="text-2xs text-gray-400 hover:text-primary border border-border rounded px-2 py-1.5"
            >
              Azzera
            </button>
          </div>
        )}
      </div>

      <p className="text-2xs text-gray-400 mb-3">{orders.length} ordini visualizzati</p>

      {isLoading ? (
        <LoadingSpinner fullPage />
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center text-gray-400">
          <p className="text-sm">Nessun ordine trovato</p>
        </div>
      ) : (
        <div>
          {orders.map((order) => (
            <OrderRow
              key={order.id}
              order={order}
              onStatusChange={() => queryClient.invalidateQueries({ queryKey: ['admin-all-orders'] })}
              onDelete={() => queryClient.invalidateQueries({ queryKey: ['admin-all-orders'] })}
            />
          ))}
        </div>
      )}
    </div>
  );
}
