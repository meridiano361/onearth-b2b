'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { Package, Download, Eye, ChevronDown, ChevronUp } from 'lucide-react';
import { formatCurrency, formatDate, getOrderStatusColor, getOrderStatusLabel } from '@/lib/utils';
import Badge from '@/components/ui/Badge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import type { Order, OrderItem } from '@/types';
import toast from 'react-hot-toast';

function OrderRow({ order, isHighlighted }: { order: Order; isHighlighted: boolean }) {
  const [isExpanded, setIsExpanded] = useState(isHighlighted);
  const [isExporting, setIsExporting] = useState(false);

  const statusColors: Record<string, string> = {
    DRAFT: 'default',
    CONFIRMED: 'info',
    PROCESSING: 'warning',
    SHIPPED: 'success',
    CANCELLED: 'danger',
  };

  async function handleExportPDF() {
    setIsExporting(true);
    try {
      const res = await fetch('/api/export/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id }),
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `order-${order.id.slice(0, 8)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('PDF exported');
    } catch {
      toast.error('Export failed');
    } finally {
      setIsExporting(false);
    }
  }

  async function handleExportExcel() {
    setIsExporting(true);
    try {
      const res = await fetch('/api/export/excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id }),
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `order-${order.id.slice(0, 8)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Excel exported');
    } catch {
      toast.error('Export failed');
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div
      className={`border rounded mb-3 overflow-hidden transition-all duration-200 ${
        isHighlighted ? 'border-accent shadow-luxury' : 'border-border'
      }`}
    >
      <div
        className="flex items-center gap-4 px-5 py-4 bg-white cursor-pointer hover:bg-cream/30 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xs font-medium tracking-widest uppercase text-gray-400">
              #{order.id.slice(0, 8).toUpperCase()}
            </span>
            <Badge variant={statusColors[order.status] as any} size="xs">
              {getOrderStatusLabel(order.status)}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs text-gray-600">
            <span>{formatDate(order.createdAt, 'datetime')}</span>
            <span className="text-gray-300">·</span>
            <span>{order.totalItems} pieces, {order.items?.length || 0} lines</span>
            <span className="text-gray-300">·</span>
            <span className="font-semibold text-primary">{formatCurrency(order.totalValue)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); handleExportExcel(); }}
            disabled={isExporting}
            className="text-xs text-gray-400 hover:text-primary border border-border rounded px-2.5 py-1.5 hover:bg-cream transition-all flex items-center gap-1"
          >
            <Download size={11} /> XLSX
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleExportPDF(); }}
            disabled={isExporting}
            className="text-xs text-gray-400 hover:text-primary border border-border rounded px-2.5 py-1.5 hover:bg-cream transition-all flex items-center gap-1"
          >
            <Download size={11} /> PDF
          </button>
          {isExpanded ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
        </div>
      </div>

      {isExpanded && order.items && (
        <div className="border-t border-border bg-cream/20 px-5 py-4">
          {order.notes && (
            <div className="mb-4 p-3 bg-white border border-border/50 rounded text-xs text-gray-600 italic">
              <span className="font-medium not-italic text-gray-500 uppercase tracking-wide text-2xs block mb-0.5">Notes</span>
              {order.notes}
            </div>
          )}
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left pb-2 text-2xs font-medium tracking-widest uppercase text-gray-400">Code</th>
                <th className="text-left pb-2 text-2xs font-medium tracking-widest uppercase text-gray-400">Product</th>
                <th className="text-right pb-2 text-2xs font-medium tracking-widest uppercase text-gray-400">Qty</th>
                <th className="text-right pb-2 text-2xs font-medium tracking-widest uppercase text-gray-400">Unit</th>
                <th className="text-right pb-2 text-2xs font-medium tracking-widest uppercase text-gray-400">Total</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id} className="border-b border-border/40 last:border-0">
                  <td className="py-2 text-gray-400 font-mono">{item.product?.code}</td>
                  <td className="py-2 text-primary">{item.product?.name}</td>
                  <td className="py-2 text-right font-medium">{item.quantity}</td>
                  <td className="py-2 text-right text-gray-500">{formatCurrency(item.unitPrice)}</td>
                  <td className="py-2 text-right font-medium text-primary">{formatCurrency(item.subtotal)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4} className="pt-3 text-right text-2xs font-medium uppercase tracking-wide text-gray-500">
                  Order Total
                </td>
                <td className="pt-3 text-right font-semibold text-primary">
                  {formatCurrency(order.totalValue)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

export default function OrdersView() {
  const searchParams = useSearchParams();
  const highlight = searchParams.get('highlight');

  const { data, isLoading } = useQuery({
    queryKey: ['my-orders'],
    queryFn: async () => {
      const res = await fetch('/api/orders?my=true');
      if (!res.ok) throw new Error('Failed to load orders');
      const json = await res.json();
      return json.data as Order[];
    },
    refetchOnMount: true,
  });

  const orders = data || [];

  return (
    <div className="px-6 py-6 max-w-4xl">
      <div className="mb-6">
        <p className="label-luxury text-accent mb-1">CASA 2027</p>
        <h1 className="font-display text-2xl text-primary font-light tracking-wide">My Orders</h1>
        <p className="mt-1 text-sm text-gray-400">
          {orders.length > 0 ? `${orders.length} order${orders.length !== 1 ? 's' : ''} placed` : 'No orders yet'}
        </p>
      </div>

      {isLoading ? (
        <LoadingSpinner fullPage text="Loading orders..." />
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-cream flex items-center justify-center mb-4">
            <Package size={24} className="text-gray-300" />
          </div>
          <h3 className="font-display text-lg text-primary font-light">No orders yet</h3>
          <p className="mt-1 text-sm text-gray-400">Start building your order from the catalog</p>
        </div>
      ) : (
        <div>
          {orders.map((order) => (
            <OrderRow
              key={order.id}
              order={order}
              isHighlighted={order.id === highlight}
            />
          ))}
        </div>
      )}
    </div>
  );
}
