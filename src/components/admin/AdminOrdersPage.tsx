'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Download, ChevronDown, ChevronUp, Filter } from 'lucide-react';
import { formatCurrency, formatDate, getOrderStatusLabel } from '@/lib/utils';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import type { Order } from '@/types';
import toast from 'react-hot-toast';

const STATUS_OPTIONS = ['', 'DRAFT', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'CANCELLED'];

function OrderRow({ order, onStatusChange }: { order: Order; onStatusChange: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const statusVariant: Record<string, string> = {
    DRAFT: 'default',
    CONFIRMED: 'info',
    PROCESSING: 'warning',
    SHIPPED: 'success',
    CANCELLED: 'danger',
  };

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
      toast.success('Status updated');
    } catch {
      toast.error('Failed to update status');
    } finally {
      setIsUpdating(false);
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
      toast.error('Export failed');
    }
  }

  return (
    <div className="border border-border rounded mb-2 overflow-hidden">
      <div
        className="flex items-center gap-4 px-5 py-3.5 bg-white hover:bg-cream/30 cursor-pointer transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs font-medium text-primary">
              {order.customer?.companyName}
            </span>
            <span className="text-2xs text-gray-400 font-mono">
              #{order.id.slice(0, 8).toUpperCase()}
            </span>
          </div>
          <p className="text-2xs text-gray-400">
            {formatDate(order.createdAt, 'datetime')} · {order.totalItems} pcs · {order.items?.length || 0} lines
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-primary">
            {formatCurrency(order.totalValue)}
          </span>

          <select
            value={order.status}
            onChange={(e) => { e.stopPropagation(); handleStatusChange(e.target.value); }}
            onClick={(e) => e.stopPropagation()}
            disabled={isUpdating}
            className="text-xs border border-border rounded px-2 py-1 focus:outline-none focus:border-accent bg-white"
          >
            {STATUS_OPTIONS.filter(Boolean).map((s) => (
              <option key={s} value={s}>{getOrderStatusLabel(s)}</option>
            ))}
          </select>

          <div className="flex gap-1">
            <button
              onClick={(e) => { e.stopPropagation(); handleExport('excel'); }}
              className="text-2xs px-2 py-1 border border-border rounded hover:bg-cream transition-colors text-gray-500"
            >
              XLSX
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleExport('pdf'); }}
              className="text-2xs px-2 py-1 border border-border rounded hover:bg-cream transition-colors text-gray-500"
            >
              PDF
            </button>
          </div>

          {expanded ? <ChevronUp size={13} className="text-gray-400" /> : <ChevronDown size={13} className="text-gray-400" />}
        </div>
      </div>

      {expanded && order.items && (
        <div className="border-t border-border bg-cream/20 px-5 py-4">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left pb-2 text-2xs font-medium uppercase tracking-wide text-gray-400">Code</th>
                <th className="text-left pb-2 text-2xs font-medium uppercase tracking-wide text-gray-400">Product</th>
                <th className="text-left pb-2 text-2xs font-medium uppercase tracking-wide text-gray-400">Category</th>
                <th className="text-right pb-2 text-2xs font-medium uppercase tracking-wide text-gray-400">Qty</th>
                <th className="text-right pb-2 text-2xs font-medium uppercase tracking-wide text-gray-400">Unit</th>
                <th className="text-right pb-2 text-2xs font-medium uppercase tracking-wide text-gray-400">Total</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id} className="border-b border-border/40 last:border-0">
                  <td className="py-2 font-mono text-gray-400">{item.product?.code}</td>
                  <td className="py-2 text-primary">{item.product?.name}</td>
                  <td className="py-2 text-gray-400">{item.product?.category?.name || '—'}</td>
                  <td className="py-2 text-right font-medium">{item.quantity}</td>
                  <td className="py-2 text-right text-gray-500">{formatCurrency(item.unitPrice)}</td>
                  <td className="py-2 text-right font-medium">{formatCurrency(item.subtotal)}</td>
                </tr>
              ))}
              <tr>
                <td colSpan={5} className="pt-3 text-right text-2xs font-medium text-gray-400 uppercase tracking-wide">
                  Order Total
                </td>
                <td className="pt-3 text-right font-semibold text-primary">
                  {formatCurrency(order.totalValue)}
                </td>
              </tr>
            </tbody>
          </table>

          {order.notes && (
            <div className="mt-3 pt-3 border-t border-border/50">
              <p className="text-2xs font-medium uppercase tracking-wide text-gray-400 mb-1">Notes</p>
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
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

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
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      o.customer?.companyName?.toLowerCase().includes(q) ||
      o.customer?.customerCode?.toLowerCase().includes(q) ||
      o.id.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="label-luxury text-accent mb-1">Admin</p>
          <h1 className="font-display text-2xl text-primary font-light">Orders</h1>
          <p className="text-sm text-gray-400 mt-0.5">{data?.total || 0} total orders</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <div className="max-w-xs flex-1">
          <Input
            placeholder="Search by customer or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search size={14} />}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-sm border border-border rounded px-3 py-2 focus:outline-none focus:border-accent bg-white text-primary"
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.filter(Boolean).map((s) => (
            <option key={s} value={s}>{getOrderStatusLabel(s)}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <LoadingSpinner fullPage />
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center text-gray-400">
          <p className="text-sm">No orders found</p>
        </div>
      ) : (
        <div>
          {orders.map((order) => (
            <OrderRow
              key={order.id}
              order={order}
              onStatusChange={() => queryClient.invalidateQueries({ queryKey: ['admin-all-orders'] })}
            />
          ))}
        </div>
      )}
    </div>
  );
}
