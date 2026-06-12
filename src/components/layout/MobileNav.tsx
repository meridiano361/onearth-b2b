'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home, LayoutGrid, Package, ShoppingCart, FolderOpen, HelpCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCartStore } from '@/store/cartStore';
import { useQuery } from '@tanstack/react-query';

type NavItem = {
  icon: React.ElementType;
  label: string;
  href: string;
  isActive: (pathname: string) => boolean;
  badge?: boolean;
  notifBadge?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  {
    icon: Home,
    label: 'Home',
    href: '/catalog',
    isActive: (p) => p === '/catalog' || p === '/home',
    notifBadge: true,
  },
  {
    icon: LayoutGrid,
    label: 'Catalogo',
    href: '/catalog/products',
    isActive: (p) => p.startsWith('/catalog/products'),
  },
  {
    icon: ShoppingCart,
    label: 'Carrelli',
    href: '/catalog/carts',
    isActive: (p) => p.startsWith('/catalog/carts'),
    badge: true,
  },
  {
    icon: Package,
    label: 'Ordini',
    href: '/catalog/orders',
    isActive: (p) => p.startsWith('/catalog/orders'),
  },
  {
    icon: FolderOpen,
    label: 'Risorse',
    href: '/catalog/risorse',
    isActive: (p) => p.startsWith('/catalog/risorse'),
  },
  {
    icon: HelpCircle,
    label: 'Aiuto',
    href: '/catalog/assistenza',
    isActive: (p) => p.startsWith('/catalog/assistenza'),
  },
];

export default function MobileNav() {
  const pathname = usePathname();
  const { getTotalItems } = useCartStore();
  const totalItems = getTotalItems();

  const { data: notifications = [] } = useQuery<{ letta: boolean }[]>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await fetch('/api/notifications');
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 60_000,
  });
  const unreadCount = notifications.filter((n) => !n.letta).length;

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-border z-30"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-stretch h-[56px]">
        {NAV_ITEMS.map(({ icon: Icon, label, href, isActive, badge, notifBadge }) => {
          const active = isActive(pathname);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-1 py-1 transition-colors relative',
                active ? 'text-gray-900' : 'text-[#9CA3AF]',
              )}
            >
              {/* Active indicator — thin line at top */}
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-[2px] rounded-full bg-gray-900" />
              )}
              <div className="relative">
                <Icon size={20} />
                {badge && totalItems > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[8px] font-bold min-w-[14px] h-[14px] rounded-full flex items-center justify-center leading-none px-[2px]">
                    {totalItems > 9 ? '9+' : totalItems}
                  </span>
                )}
                {notifBadge && unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[8px] font-bold min-w-[14px] h-[14px] rounded-full flex items-center justify-center leading-none px-[2px]">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] leading-none truncate w-full text-center px-0.5">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
