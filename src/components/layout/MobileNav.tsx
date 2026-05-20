'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, LayoutGrid, Heart, Package, MapPin, HelpCircle, X, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { cn, formatCurrency } from '@/lib/utils';
import { useCartStore } from '@/store/cartStore';
import CartSidebar from '@/components/cart/CartSidebar';

export default function MobileNav() {
  const [ordersOpen, setOrdersOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'current' | 'saved'>('current');
  const pathname = usePathname();
  const { getTotalItems } = useCartStore();
  const totalItems = getTotalItems();
  const tn = useTranslations('nav');

  useEffect(() => {
    setOrdersOpen(false);
  }, [pathname]);

  const isHome = pathname === '/catalog' || pathname === '/home';
  const isCatalog = pathname.startsWith('/catalog/products');
  const isFavorites = pathname.startsWith('/catalog/preferiti');
  const isOrders = pathname.startsWith('/catalog/orders') || ordersOpen;
  const isDestinazioni = pathname.startsWith('/catalog/destinazioni');
  const isAssistenza = pathname.startsWith('/catalog/assistenza');

  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ['mobile-saved-orders'],
    queryFn: async () => {
      const res = await fetch('/api/orders?limit=8');
      if (!res.ok) return [];
      return (await res.json()).data ?? [];
    },
    enabled: ordersOpen && activeTab === 'saved',
    staleTime: 30_000,
  });

  const savedOrders: any[] = ordersData ?? [];

  function navCls(active: boolean) {
    return cn(
      'flex-1 flex flex-col items-center justify-center gap-0.5 py-3 transition-colors',
      active ? 'text-gray-900 font-semibold' : 'text-gray-400'
    );
  }

  function tabCls(active: boolean) {
    return cn(
      'flex-1 py-2.5 text-xs font-medium border-b-2 transition-colors flex items-center justify-center gap-1.5',
      active ? 'text-gray-900 border-gray-900' : 'text-gray-400 border-transparent'
    );
  }

  return (
    <>
      {/* Bottom tab bar */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-border z-30"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex items-stretch">
          <Link href="/catalog" className={navCls(isHome)}>
            <Home size={20} />
            <span className="text-2xs">Home</span>
          </Link>

          <Link href="/catalog/products" className={navCls(isCatalog)}>
            <LayoutGrid size={20} />
            <span className="text-2xs">{tn('catalog')}</span>
          </Link>

          <Link href="/catalog/preferiti" className={navCls(isFavorites)}>
            <Heart size={20} className={isFavorites ? 'fill-gray-900' : ''} />
            <span className="text-2xs">{tn('favorites')}</span>
          </Link>

          <button
            onClick={() => { setOrdersOpen(true); setActiveTab('current'); }}
            className={navCls(isOrders)}
          >
            <div className="relative">
              <Package size={20} />
              {totalItems > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-2xs font-bold w-4 h-4 rounded-full flex items-center justify-center leading-none">
                  {totalItems > 99 ? '99+' : totalItems}
                </span>
              )}
            </div>
            <span className="text-2xs">{tn('orders')}</span>
          </button>

          <Link href="/catalog/destinazioni" className={navCls(isDestinazioni)}>
            <MapPin size={20} />
            <span className="text-2xs">{tn('channels')}</span>
          </Link>

          <Link href="/catalog/assistenza" className={navCls(isAssistenza)}>
            <HelpCircle size={20} />
            <span className="text-2xs">{tn('assistance')}</span>
          </Link>
        </div>
      </nav>

      {/* Orders drawer */}
      {ordersOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setOrdersOpen(false)}
          />
          <div
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[85vh] flex flex-col shadow-luxury-xl animate-slide-up"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3 flex-shrink-0 border-b border-border">
              <span className="text-xs font-semibold text-primary uppercase tracking-widest">Ordini</span>
              <button
                onClick={() => setOrdersOpen(false)}
                className="text-gray-400 hover:text-primary transition-colors p-1"
              >
                <X size={18} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-border flex-shrink-0">
              <button className={tabCls(activeTab === 'current')} onClick={() => setActiveTab('current')}>
                Ordine corrente
                {totalItems > 0 && (
                  <span className="bg-primary text-white text-2xs px-1.5 py-0.5 rounded-full leading-none">
                    {totalItems}
                  </span>
                )}
              </button>
              <button className={tabCls(activeTab === 'saved')} onClick={() => setActiveTab('saved')}>
                I miei ordini
              </button>
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto">
              {activeTab === 'current' ? (
                <CartSidebar />
              ) : ordersLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 size={24} className="animate-spin text-gray-300" />
                </div>
              ) : savedOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                  <Package size={32} className="text-gray-200 mb-3" />
                  <p className="text-sm text-gray-400 font-light">Nessun ordine trovato</p>
                </div>
              ) : (
                <div className="px-4 py-3 space-y-2">
                  {savedOrders.map((order) => (
                    <Link
                      key={order.id}
                      href="/catalog/orders"
                      onClick={() => setOrdersOpen(false)}
                      className="flex items-center justify-between p-3 rounded border border-border hover:border-primary/30 hover:bg-cream transition-colors"
                    >
                      <div>
                        <p className="text-xs font-medium text-primary">
                          #{(order.orderNumber ?? order.id.slice(-6)).toUpperCase()}
                        </p>
                        <p className="text-2xs text-gray-400">
                          {new Date(order.createdAt).toLocaleDateString('it-IT')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-medium text-primary">{formatCurrency(order.totalValue)}</p>
                        <p className="text-2xs text-gray-400">{order.totalItems} prodotti</p>
                      </div>
                    </Link>
                  ))}
                  <Link
                    href="/catalog/orders"
                    onClick={() => setOrdersOpen(false)}
                    className="block w-full text-center py-2.5 text-xs text-primary font-medium border border-primary/30 rounded hover:bg-cream transition-colors mt-2"
                  >
                    Vedi tutti gli ordini →
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
