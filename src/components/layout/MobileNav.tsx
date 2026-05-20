'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, LayoutGrid, Heart, ShoppingCart, Menu, X, Package, Store, HelpCircle, LogOut } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { signOut } from 'next-auth/react';
import { cn } from '@/lib/utils';
import { useCartStore } from '@/store/cartStore';
import CartSidebar from '@/components/cart/CartSidebar';

export default function MobileNav() {
  const [cartOpen, setCartOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const { getTotalItems } = useCartStore();
  const totalItems = getTotalItems();
  const tn = useTranslations('nav');

  const isHome = pathname === '/catalog' || pathname === '/home';
  const isCatalog = pathname.startsWith('/catalog/products');
  const isFavorites = pathname.startsWith('/catalog/preferiti');

  return (
    <>
      {/* Bottom tab bar */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-border z-30"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex items-stretch">
          {/* Home */}
          <Link
            href="/catalog"
            className={cn(
              'flex-1 flex flex-col items-center justify-center gap-0.5 py-3 text-xs transition-colors',
              isHome ? 'text-primary font-semibold' : 'text-gray-400'
            )}
          >
            <Home size={20} />
            <span className="text-2xs tracking-wide">{tn('home')}</span>
          </Link>

          {/* Catalogo */}
          <Link
            href="/catalog/products"
            className={cn(
              'flex-1 flex flex-col items-center justify-center gap-0.5 py-3 text-xs transition-colors',
              isCatalog ? 'text-primary font-semibold' : 'text-gray-400'
            )}
          >
            <LayoutGrid size={20} />
            <span className="text-2xs tracking-wide">{tn('catalog')}</span>
          </Link>

          {/* Preferiti */}
          <Link
            href="/catalog/preferiti"
            className={cn(
              'flex-1 flex flex-col items-center justify-center gap-0.5 py-3 text-xs transition-colors',
              isFavorites ? 'text-primary font-semibold' : 'text-gray-400'
            )}
          >
            <Heart size={20} className={isFavorites ? 'fill-primary' : ''} />
            <span className="text-2xs tracking-wide">{tn('favorites')}</span>
          </Link>

          {/* Ordine (cart) */}
          <button
            onClick={() => setCartOpen(true)}
            className={cn(
              'flex-1 flex flex-col items-center justify-center gap-0.5 py-3 text-xs relative transition-colors',
              totalItems > 0 ? 'text-primary font-semibold' : 'text-gray-400'
            )}
          >
            <div className="relative">
              <ShoppingCart size={20} />
              {totalItems > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-accent text-white text-2xs font-bold w-4 h-4 rounded-full flex items-center justify-center leading-none">
                  {totalItems > 99 ? '99+' : totalItems}
                </span>
              )}
            </div>
            <span className="text-2xs tracking-wide">{tn('orderTab')}</span>
          </button>

          {/* Menu */}
          <button
            onClick={() => setMenuOpen(true)}
            className={cn(
              'flex-1 flex flex-col items-center justify-center gap-0.5 py-3 text-xs transition-colors',
              menuOpen ? 'text-primary font-semibold' : 'text-gray-400'
            )}
          >
            <Menu size={20} />
            <span className="text-2xs tracking-wide">{tn('menu')}</span>
          </button>
        </div>
      </nav>

      {/* Cart drawer */}
      {cartOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setCartOpen(false)}
          />
          <div
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[92vh] flex flex-col shadow-luxury-xl animate-slide-up"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
          >
            <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0 border-b border-border">
              <span className="text-xs font-semibold text-primary uppercase tracking-widest">{tn('orderDrawer')}</span>
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

      {/* Menu drawer */}
      {menuOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMenuOpen(false)}
          />
          <div
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-luxury-xl animate-slide-up"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
          >
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border">
              <span className="text-xs font-semibold text-primary uppercase tracking-widest">{tn('menu')}</span>
              <button onClick={() => setMenuOpen(false)} className="text-gray-400 hover:text-primary transition-colors p-1">
                <X size={18} />
              </button>
            </div>
            <div className="py-2">
              <Link
                href="/catalog/orders"
                onClick={() => setMenuOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-5 py-4 text-sm transition-colors',
                  pathname.startsWith('/catalog/orders') ? 'text-primary font-semibold bg-cream' : 'text-gray-600 hover:bg-cream'
                )}
              >
                <Package size={18} />
                {tn('orders')}
              </Link>
              <Link
                href="/catalog/canali"
                onClick={() => setMenuOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-5 py-4 text-sm transition-colors',
                  pathname.startsWith('/catalog/canali') ? 'text-primary font-semibold bg-cream' : 'text-gray-600 hover:bg-cream'
                )}
              >
                <Store size={18} />
                {tn('channels')}
              </Link>
              <Link
                href="/catalog/assistenza"
                onClick={() => setMenuOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-5 py-4 text-sm transition-colors',
                  pathname.startsWith('/catalog/assistenza') ? 'text-primary font-semibold bg-cream' : 'text-gray-600 hover:bg-cream'
                )}
              >
                <HelpCircle size={18} />
                {tn('assistance')}
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="w-full flex items-center gap-3 px-5 py-4 text-sm text-gray-600 hover:bg-cream transition-colors border-t border-border mt-1"
              >
                <LogOut size={18} />
                {tn('logout')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
