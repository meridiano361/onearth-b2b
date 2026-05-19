'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutGrid, Package, ShoppingCart, HelpCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCartStore } from '@/store/cartStore';
import CartSidebar from '@/components/cart/CartSidebar';

export default function MobileNav() {
  const [cartOpen, setCartOpen] = useState(false);
  const pathname = usePathname();
  const { getTotalItems } = useCartStore();
  const totalItems = getTotalItems();

  return (
    <>
      {/* Bottom tab bar */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-border z-30"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex items-stretch">
          {/* Catalogo */}
          <Link
            href="/catalog"
            className={cn(
              'flex-1 flex flex-col items-center justify-center gap-0.5 py-3 text-xs transition-colors',
              pathname.startsWith('/catalog') ? 'text-primary font-semibold' : 'text-gray-400'
            )}
          >
            <LayoutGrid size={20} />
            <span className="text-2xs tracking-wide">Catalogo</span>
          </Link>

          {/* Cart — center prominent tab */}
          <button
            onClick={() => setCartOpen(true)}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 py-3 text-xs relative transition-colors"
          >
            <div className="relative">
              <div className={cn(
                'w-11 h-11 rounded-full flex items-center justify-center transition-colors',
                cartOpen ? 'bg-warm-darker' : 'bg-primary'
              )}>
                <ShoppingCart size={19} className="text-white" />
              </div>
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 bg-accent text-white text-2xs font-bold w-5 h-5 rounded-full flex items-center justify-center leading-none">
                  {totalItems > 99 ? '99+' : totalItems}
                </span>
              )}
            </div>
            <span className={cn(
              'text-2xs tracking-wide',
              totalItems > 0 ? 'text-primary font-semibold' : 'text-gray-400'
            )}>
              Ordine
            </span>
          </button>

          {/* I miei Ordini */}
          <Link
            href="/catalog/orders"
            className={cn(
              'flex-1 flex flex-col items-center justify-center gap-0.5 py-3 text-xs transition-colors',
              (pathname.startsWith('/catalog/orders') || pathname.startsWith('/orders')) ? 'text-primary font-semibold' : 'text-gray-400'
            )}
          >
            <Package size={20} />
            <span className="text-2xs tracking-wide">Ordini</span>
          </Link>

          {/* Assistenza */}
          <Link
            href="/catalog/assistenza"
            className={cn(
              'flex-1 flex flex-col items-center justify-center gap-0.5 py-3 text-xs transition-colors',
              pathname.startsWith('/catalog/assistenza') ? 'text-primary font-semibold' : 'text-gray-400'
            )}
          >
            <HelpCircle size={20} />
            <span className="text-2xs tracking-wide">Assistenza</span>
          </Link>
        </div>
      </nav>

      {/* Cart drawer */}
      {cartOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setCartOpen(false)}
          />
          <div
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[92vh] flex flex-col shadow-luxury-xl animate-slide-up"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
          >
            <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0 border-b border-border">
              <span className="text-xs font-semibold text-primary uppercase tracking-widest">Il tuo Ordine</span>
              <button
                onClick={() => setCartOpen(false)}
                className="text-gray-400 hover:text-primary transition-colors p-1"
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
