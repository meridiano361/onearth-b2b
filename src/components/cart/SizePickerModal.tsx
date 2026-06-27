'use client';

import { useState } from 'react';
import { X, ShoppingCart, Minus, Plus } from 'lucide-react';
import type { Product } from '@/types';
import type { SizeVariantQty } from '@/store/cartStore';

interface Props {
  product: Product;
  onClose: () => void;
  onConfirm: (variants: SizeVariantQty[]) => void;
}

export default function SizePickerModal({ product, onClose, onConfirm }: Props) {
  const variants = product.sizeVariants ?? [];
  const [quantities, setQuantities] = useState<Record<string, number>>(
    Object.fromEntries(variants.map((v) => [v.taglia, 0]))
  );

  function change(taglia: string, delta: number) {
    setQuantities((prev) => ({ ...prev, [taglia]: Math.max(0, (prev[taglia] ?? 0) + delta) }));
  }

  function handleInput(taglia: string, val: string) {
    const n = parseInt(val, 10);
    setQuantities((prev) => ({ ...prev, [taglia]: isNaN(n) || n < 0 ? 0 : n }));
  }

  const total = Object.values(quantities).reduce((s, q) => s + q, 0);

  function handleConfirm() {
    const selected: SizeVariantQty[] = variants
      .filter((v) => (quantities[v.taglia] ?? 0) > 0)
      .map((v) => ({ taglia: v.taglia, codice: v.codice, quantity: quantities[v.taglia] }));
    if (selected.length === 0) return;
    onConfirm(selected);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-white w-full sm:max-w-sm sm:rounded-lg shadow-xl">
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-border">
          <div>
            <p className="text-xs font-mono text-gray-400">{product.code}</p>
            <p className="text-sm font-semibold text-primary leading-snug mt-0.5 pr-4">{product.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-primary p-1 flex-shrink-0">
            <X size={16} />
          </button>
        </div>

        {/* Size rows */}
        <div className="px-5 py-4 space-y-3">
          <p className="text-2xs font-semibold text-gray-400 uppercase tracking-widest">Seleziona quantità per taglia</p>
          {variants.map((v) => (
            <div key={v.taglia} className="flex items-center gap-3">
              <div className="w-10 flex-shrink-0">
                <span className="text-sm font-semibold text-primary">{v.taglia}</span>
              </div>
              <span className="text-2xs font-mono text-gray-400 flex-1 truncate">{v.codice}</span>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={() => change(v.taglia, -1)}
                  className="w-7 h-7 rounded border border-border flex items-center justify-center text-gray-500 hover:border-primary hover:text-primary transition-colors disabled:opacity-30"
                  disabled={!quantities[v.taglia]}
                >
                  <Minus size={12} />
                </button>
                <input
                  type="number"
                  min={0}
                  value={quantities[v.taglia] ?? 0}
                  onChange={(e) => handleInput(v.taglia, e.target.value)}
                  className="w-12 h-7 text-center text-sm font-medium border border-border rounded focus:outline-none focus:border-accent"
                />
                <button
                  onClick={() => change(v.taglia, 1)}
                  className="w-7 h-7 rounded border border-border flex items-center justify-center text-gray-500 hover:border-primary hover:text-primary transition-colors"
                >
                  <Plus size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border flex items-center gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 text-xs border border-border rounded text-gray-500 hover:bg-cream transition-colors">
            Annulla
          </button>
          <button
            onClick={handleConfirm}
            disabled={total === 0}
            className="flex-1 py-2.5 text-xs bg-primary text-white rounded hover:bg-warm-darker disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 transition-colors"
          >
            <ShoppingCart size={13} />
            Aggiungi {total > 0 ? `(${total} pz)` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}
