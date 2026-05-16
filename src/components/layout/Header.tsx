'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { Session } from 'next-auth';
import { LogOut, LayoutGrid, Package, ShoppingBag } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface HeaderProps {
  session: Session;
}

export default function Header({ session }: HeaderProps) {
  const pathname = usePathname();

  const navItems = [
    { href: '/catalog', label: 'Catalogo', icon: LayoutGrid },
    { href: '/orders', label: 'I miei Ordini', icon: Package },
  ];

  return (
    <header className="h-14 bg-white border-b border-border flex items-center px-6 gap-6 flex-shrink-0 z-10">
      {/* Logo */}
      <Link href="/catalog" className="flex items-center gap-3 mr-2">
        <div className="flex flex-col">
          <span className="text-2xs tracking-widest uppercase text-accent leading-none">Meridiano 361</span>
          <span className="font-display text-base text-primary leading-tight tracking-widest">ON EARTH</span>
        </div>
      </Link>

      {/* Divider */}
      <div className="h-5 w-px bg-border" />

      {/* Collection badge */}
      <span className="text-2xs tracking-widest uppercase text-gray-400 font-medium">
        CASA 2027
      </span>

      {/* Nav */}
      <nav className="flex items-center gap-1 ml-4">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all duration-150',
              pathname === href || pathname.startsWith(href + '/')
                ? 'bg-cream text-primary'
                : 'text-gray-500 hover:text-primary hover:bg-cream/60'
            )}
          >
            <Icon size={13} />
            {label}
          </Link>
        ))}
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* User info */}
      <div className="flex items-center gap-4">
        <div className="text-right hidden sm:block">
          <p className="text-xs font-medium text-primary truncate max-w-[140px]">
            {session.user.companyName}
          </p>
          <p className="text-2xs text-gray-400 uppercase tracking-wide">
            {session.user.customerCode}
          </p>
        </div>

        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-primary transition-colors px-2 py-1.5 rounded hover:bg-cream"
          title="Esci"
        >
          <LogOut size={14} />
          <span className="hidden sm:inline">Esci</span>
        </button>
      </div>
    </header>
  );
}
