'use client';

import { useState } from 'react';
import { ShoppingCart, X } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import CartSidebar from './CartSidebar';

export default function MobileCartButton() {
  const [isOpen, setIsOpen] = useState(false);
  const { getTotalItems } = useCartStore();
  const totalItems = getTotalItems();

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setIsOpen(true)}
        className="lg:hidden fixed right-4 z-30 bg-primary text-background rounded-full w-14 h-14 flex items-center justify-center shadow-luxury-xl"
        style={{ bottom: 'calc(56px + env(safe-area-inset-bottom, 0px) + 1rem)' }}
      >
        <ShoppingCart size={20} />
        {totalItems > 0 && (
          <span className="absolute -top-1 -right-1 bg-accent text-white text-2xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
            {totalItems > 99 ? '99+' : totalItems}
          </span>
        )}
      </button>

      {/* Drawer */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-primary/30 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-xl max-h-[85vh] flex flex-col shadow-luxury-xl">
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <span className="text-xs font-medium text-primary uppercase tracking-wide">Carrello corrente</span>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-primary transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <CartSidebar />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
