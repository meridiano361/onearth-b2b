'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import {
  LayoutDashboard,
  Package,
  Users,
  ShoppingCart,
  Tag,
  LogOut,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/orders', label: 'Ordini', icon: ShoppingCart },
  { href: '/admin/products', label: 'Prodotti', icon: Package },
  { href: '/admin/customers', label: 'Clienti', icon: Users },
  { href: '/admin/categories', label: 'Categorie', icon: Tag },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + '/');
  }

  return (
    <aside className="w-56 bg-primary flex flex-col h-full flex-shrink-0">
      {/* Brand */}
      <div className="px-6 py-6 border-b border-white/10">
        <p className="text-2xs tracking-widest uppercase text-accent font-medium leading-none mb-1">
          Meridiano 361
        </p>
        <h1 className="font-display text-lg text-white tracking-widest">ON EARTH</h1>
        <p className="text-2xs text-gray-600 uppercase tracking-widest mt-1">Amministrazione</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon, exact }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded text-xs font-medium transition-all duration-150',
              isActive(href, exact)
                ? 'bg-white/10 text-white'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            )}
          >
            <Icon size={15} />
            {label}
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-white/10">
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded text-xs text-gray-500 hover:text-white hover:bg-white/5 transition-all duration-150"
        >
          <LogOut size={15} />
          Esci
        </button>
      </div>
    </aside>
  );
}
