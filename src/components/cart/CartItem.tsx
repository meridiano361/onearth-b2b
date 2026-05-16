'use client';

import { X, AlertCircle } from 'lucide-react';
import { cn, formatCurrency, isValidLotQuantity } from '@/lib/utils';
import { useCartStore } from '@/store/cartStore';
import QuantitySelector from '@/components/catalog/QuantitySelector';
import type { CartItem as CartItemType } from '@/types';

interface CartItemProps {
  item: CartItemType;
}

export default function CartItem({ item }: CartItemProps) {
  const { removeItem, updateQuantity } = useCartStore();
  const hasLotWarning = !isValidLotQuantity(item.quantity, item.product.lotSize);

  return (
    <div
      className={cn(
        'group py-3 px-4 border-b border-border/50 last:border-b-0',
        hasLotWarning && 'bg-amber-50/50'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-2xs font-medium tracking-wide uppercase text-gray-400 leading-none mb-0.5">
            {item.product.code}
          </p>
          <p className="text-xs font-medium text-primary leading-snug line-clamp-2 mb-1.5">
            {item.product.name}
          </p>
          <div className="flex items-center gap-2">
            <QuantitySelector
              value={item.quantity}
              onChange={(qty) => updateQuantity(item.productId, qty)}
              lotSize={item.product.lotSize}
              min={0}
              compact
            />
            <span className="text-xs font-medium text-primary ml-auto">
              {formatCurrency(item.product.costPrice * item.quantity)}
            </span>
          </div>

          {hasLotWarning && (
            <div className="flex items-center gap-1 mt-1.5">
              <AlertCircle size={10} className="text-amber-500 flex-shrink-0" />
              <p className="text-2xs text-amber-600">
                Multiplo di {item.product.lotSize} richiesto
              </p>
            </div>
          )}
        </div>

        <button
          onClick={() => removeItem(item.productId)}
          className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-gray-600 transition-all flex-shrink-0 mt-0.5"
          title="Remove"
        >
          <X size={13} />
        </button>
      </div>
    </div>
  );
}
