'use client';

import { formatCurrency } from '@/lib/utils';
import { useCartStore } from '@/store/cartStore';

export default function CartSummary() {
  const { getTotalItems, getTotalValue, getTotalLines } = useCartStore();

  const totalItems = getTotalItems();
  const totalValue = getTotalValue();
  const totalLines = getTotalLines();

  return (
    <div className="px-4 py-4 border-t border-border bg-cream/30">
      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-xs text-gray-500">
          <span>Lines</span>
          <span className="font-medium text-primary">{totalLines}</span>
        </div>
        <div className="flex justify-between text-xs text-gray-500">
          <span>Total pieces</span>
          <span className="font-medium text-primary">{totalItems}</span>
        </div>
        <div className="h-px bg-border/60 my-2" />
        <div className="flex justify-between text-sm">
          <span className="font-medium text-primary">Order Value</span>
          <span className="font-semibold text-primary">{formatCurrency(totalValue)}</span>
        </div>
        <p className="text-2xs text-gray-400">(Cost prices, ex-works)</p>
      </div>
    </div>
  );
}
