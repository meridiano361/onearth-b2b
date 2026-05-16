'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ShoppingBag, Check, AlertCircle, Layers } from 'lucide-react';
import { cn, formatCurrency, isValidLotQuantity, roundToLot } from '@/lib/utils';
import { useCartStore } from '@/store/cartStore';
import QuantitySelector from './QuantitySelector';
import type { Product } from '@/types';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { getItemQuantity, updateQuantity, addItem } = useCartStore();
  const cartQty = getItemQuantity(product.id);
  const [localQty, setLocalQty] = useState(0);
  const [justAdded, setJustAdded] = useState(false);

  const inCart = cartQty > 0;
  const hasLotWarning = cartQty > 0 && !isValidLotQuantity(cartQty, product.lotSize);

  function handleQuantityChange(qty: number) {
    updateQuantity(product.id, qty);
  }

  function handleAddToCart() {
    const qty = localQty > 0 ? localQty : product.lotSize || 1;
    addItem(product, qty);
    setLocalQty(0);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1500);
  }

  function handleCardClick() {
    if (!inCart) {
      addItem(product, product.lotSize || 1);
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 1500);
    }
  }

  return (
    <div
      className={cn(
        'group bg-white border rounded transition-all duration-200 hover:shadow-luxury-lg cursor-pointer',
        inCart ? 'border-accent/50 shadow-luxury' : 'border-border',
        hasLotWarning && 'border-amber-300'
      )}
    >
      {/* Image */}
      <div
        className="aspect-square relative bg-cream overflow-hidden rounded-t"
        onClick={handleCardClick}
      >
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-103"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <span className="font-display text-2xl text-gray-300 tracking-wider">
              {product.code.slice(0, 2)}
            </span>
          </div>
        )}

        {/* In-cart overlay */}
        {inCart && (
          <div className="absolute top-2 right-2 bg-accent rounded-full p-1">
            <Check size={10} className="text-white" />
          </div>
        )}

        {/* LOT badge */}
        {product.lotSize > 1 && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-white/90 backdrop-blur-sm px-1.5 py-0.5 rounded">
            <Layers size={9} className="text-gray-500" />
            <span className="text-2xs text-gray-600 font-medium">LOT {product.lotSize}</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        {/* Code */}
        <p className="text-2xs font-medium tracking-widest uppercase text-gray-400 mb-0.5">
          {product.code}
        </p>

        {/* Name */}
        <h3 className="text-sm font-medium text-primary leading-snug mb-2 line-clamp-2">
          {product.name}
        </h3>

        {/* Prices */}
        <div className="flex items-end justify-between mb-3">
          <div>
            <p className="text-2xs text-gray-400 uppercase tracking-wide">Costo</p>
            <p className="text-sm font-semibold text-primary">
              {formatCurrency(product.costPrice)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xs text-gray-400 uppercase tracking-wide">Vendita</p>
            <p className="text-xs text-gray-500">
              {formatCurrency(product.retailPrice)}
            </p>
          </div>
        </div>

        {/* Notes */}
        {product.notes && (
          <p className="text-2xs text-gray-400 mb-3 line-clamp-2 italic">
            {product.notes}
          </p>
        )}

        {/* Lot warning */}
        {hasLotWarning && (
          <div className="flex items-center gap-1 mb-2 p-1.5 bg-amber-50 rounded border border-amber-200">
            <AlertCircle size={11} className="text-amber-500 flex-shrink-0" />
            <p className="text-2xs text-amber-700">
              Adatta la quantità al multiplo di {product.lotSize}
            </p>
          </div>
        )}

        {/* Cart controls */}
        {inCart ? (
          <QuantitySelector
            value={cartQty}
            onChange={handleQuantityChange}
            lotSize={product.lotSize}
            min={0}
          />
        ) : (
          <button
            onClick={handleCardClick}
            className={cn(
              'w-full py-2 text-xs font-medium rounded transition-all duration-200',
              justAdded
                ? 'bg-accent/20 text-accent border border-accent/30'
                : 'bg-primary text-background hover:bg-warm-darker active:scale-95'
            )}
          >
            {justAdded ? (
              <span className="flex items-center justify-center gap-1.5">
                <Check size={12} /> Aggiunto
              </span>
            ) : (
              <span className="flex items-center justify-center gap-1.5">
                <ShoppingBag size={12} />
                Aggiungi all&apos;Ordine
              </span>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
