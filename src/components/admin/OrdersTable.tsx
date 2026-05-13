'use client';

import { formatCurrency, formatDate, getOrderStatusLabel } from '@/lib/utils';
import Badge from '@/components/ui/Badge';
import type { Order } from '@/types';

interface OrdersTableProps {
  orders: Order[];
  onStatusChange?: (orderId: string, status: string) => void;
  showCustomer?: boolean;
}

export default function OrdersTable({
  orders,
  onStatusChange,
  showCustomer = true,
}: OrdersTableProps) {
  const statusVariant: Record<string, string> = {
    DRAFT: 'default',
    CONFIRMED: 'info',
    PROCESSING: 'warning',
    SHIPPED: 'success',
    CANCELLED: 'danger',
  };

  if (orders.length === 0) {
    return (
      <p className="text-sm text-gray-400 text-center py-8">No orders to display</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="table-luxury">
        <thead>
          <tr>
            <th>Order ID</th>
            {showCustomer && <th>Customer</th>}
            <th>Date</th>
            <th>Lines</th>
            <th>Pieces</th>
            <th>Value</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id}>
              <td>
                <span className="font-mono text-xs text-gray-400">
                  #{order.id.slice(0, 8).toUpperCase()}
                </span>
              </td>
              {showCustomer && (
                <td>
                  <div>
                    <p className="text-xs font-medium text-primary">{order.customer?.companyName}</p>
                    <p className="text-2xs text-gray-400">{order.customer?.customerCode}</p>
                  </div>
                </td>
              )}
              <td className="text-xs text-gray-500">{formatDate(order.createdAt, 'datetime')}</td>
              <td className="text-xs text-center">{order.items?.length || 0}</td>
              <td className="text-xs text-center">{order.totalItems}</td>
              <td className="text-xs font-semibold text-primary">{formatCurrency(order.totalValue)}</td>
              <td>
                {onStatusChange ? (
                  <select
                    value={order.status}
                    onChange={(e) => onStatusChange(order.id, e.target.value)}
                    className="text-xs border border-border rounded px-2 py-1 focus:outline-none focus:border-accent"
                  >
                    {['DRAFT', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'CANCELLED'].map((s) => (
                      <option key={s} value={s}>{getOrderStatusLabel(s)}</option>
                    ))}
                  </select>
                ) : (
                  <Badge variant={statusVariant[order.status] as any} size="xs">
                    {getOrderStatusLabel(order.status)}
                  </Badge>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
