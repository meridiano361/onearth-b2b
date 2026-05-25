'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home, LayoutGrid, Heart, Package, Menu,
  MapPin, FolderOpen, HelpCircle, LogOut,
  X, Loader2,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { signOut } from 'next-auth/react';
import { cn, formatCurrency } from '@/lib/utils';
import { useCartStore } from '@/store/cartStore';
import CartSidebar from '@/components/cart/CartSidebar';

// ─── Sub-nav items inside "Altro" drawer ─────────────────────────────────────

const ALTRO_ITEMS = [
  { icon: MapPin,      label: 'Destinazioni', href: '/catalog/destinazioni' },
  { icon: FolderOpen,  label: 'Risorse',       href: '/catalog/risorse' },
  { icon: HelpCircle,  label: 'Assistenza',    href: '/catalog/assistenza' },
] as const;

// ─── Shared helpers ───────────────────────────────────────────────────────────

function navItemCls(active: boolean) {
  return cn(
    'flex-1 flex flex-col items-center justify-center gap-[3px] py-1 transition-colors relative',
    active ? 'text-gray-900' : 'text-[#9CA3AF]',
  );
}

function ActiveDot({ active }: { active: boolean }) {
  if (!active) return null;
  return <span className="absolute bottom-[1px] left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-gray-900" />;
}

function tabCls(active: boolean) {
  return cn(
    'flex-1 py-2.5 text-xs font-medium border-b-2 transition-colors flex items-center justify-center gap-1.5',
    active ? 'text-gray-900 border-gray-900' : 'text-gray-400 border-transparent',
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function MobileNav() {
  const [ordersOpen, setOrdersOpen] = useState(false);
  const [altroOpen, setAltroOpen]   = useState(false);
  const [activeTab, setActiveTab]   = useState<'current' | 'saved'>('current');

  const pathname = usePathname();
  const { getTotalItems } = useCartStore();
  const totalItems = getTotalItems();

  useEffect(() => {
    setOrdersOpen(false);
    setAltroOpen(false);
  }, [pathname]);

  const isHome      = pathname === '/catalog' || pathname === '/home';
  const isCatalogo  = pathname.startsWith('/catalog/products');
  const isPreferiti = pathname.startsWith('/catalog/preferiti');
  const isOrdini    = pathname.startsWith('/catalog/orders') || ordersOpen;
  const isAltro     = altroOpen || ALTRO_ITEMS.some((item) => pathname.startsWith(item.href));

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

  return (
    <>
      {/* ── Bottom tab bar ──────────────────────────────────────── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-border z-30"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)', height: 56 }}
      >
        <div className="flex items-stretch h-full">

          {/* Home */}
          <Link href="/catalog" className={navItemCls(isHome)}>
            <Home size={18} />
            <span className="text-[10px]">Home</span>
            <ActiveDot active={isHome} />
          </Link>

          {/* Catalogo */}
          <Link href="/catalog/products" className={navItemCls(isCatalogo)}>
            <LayoutGrid size={18} />
            <span className="text-[10px]">Catalogo</span>
            <ActiveDot active={isCatalogo} />
          </Link>

          {/* Preferiti */}
          <Link href="/catalog/preferiti" className={navItemCls(isPreferiti)}>
            <Heart size={18} className={isPreferiti ? 'fill-gray-900' : ''} />
            <span className="text-[10px]">Preferiti</span>
            <ActiveDot active={isPreferiti} />
          </Link>

          {/* Ordini */}
          <button
            onClick={() => { setOrdersOpen(true); setActiveTab('current'); }}
            className={navItemCls(isOrdini)}
          >
            <div className="relative">
              <Package size={18} />
              {totalItems > 0 && (
                <span className="absolute -top-1.5 -right-2.5 bg-red-500 text-white text-[9px] font-bold w-[14px] h-[14px] rounded-full flex items-center justify-center leading-none">
                  {totalItems > 99 ? '99+' : totalItems}
                </span>
              )}
            </div>
            <span className="text-[10px]">Ordini</span>
            <ActiveDot active={isOrdini} />
          </button>

          {/* Altro */}
          <button
            onClick={() => setAltroOpen(true)}
            className={navItemCls(isAltro)}
          >
            <Menu size={18} />
            <span className="text-[10px]">Altro</span>
            <ActiveDot active={isAltro} />
          </button>

        </div>
      </nav>

      {/* ── Ordini drawer ────────────────────────────────────────── */}
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
            <div className="flex items-center justify-between px-5 pt-4 pb-3 flex-shrink-0 border-b border-border">
              <span className="text-xs font-semibold text-primary uppercase tracking-widest">Ordini</span>
              <button onClick={() => setOrdersOpen(false)} className="text-gray-400 hover:text-primary transition-colors p-1">
                <X size={18} />
              </button>
            </div>

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

      {/* ── Altro drawer ─────────────────────────────────────────── */}
      {altroOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setAltroOpen(false)}
          />
          <div
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-luxury-xl animate-slide-up"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
          >
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border">
              <span className="text-xs font-semibold text-primary uppercase tracking-widest">Menu</span>
              <button onClick={() => setAltroOpen(false)} className="text-gray-400 hover:text-primary transition-colors p-1">
                <X size={18} />
              </button>
            </div>
            <div className="py-2">
              {ALTRO_ITEMS.map(({ icon: Icon, label, href }) => {
                const active = pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setAltroOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-5 py-3.5 transition-colors',
                      active ? 'text-gray-900 font-medium' : 'text-gray-600 hover:text-gray-900 hover:bg-cream/60',
                    )}
                  >
                    <Icon size={18} className={active ? 'text-gray-900' : 'text-gray-400'} />
                    <span className="text-sm">{label}</span>
                  </Link>
                );
              })}
              <div className="border-t border-border mt-2 pt-2">
                <button
                  onClick={() => signOut({ callbackUrl: '/login' })}
                  className="flex items-center gap-3 px-5 py-3.5 w-full text-left text-red-500 hover:text-red-700 hover:bg-red-50/60 transition-colors"
                >
                  <LogOut size={18} />
                  <span className="text-sm">Esci</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
