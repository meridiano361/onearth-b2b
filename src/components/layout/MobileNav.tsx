'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutGrid, Package } from 'lucide-react';
import { cn } from '@/lib/utils';

const items = [
  { href: '/catalog', label: 'Catalogo', icon: LayoutGrid },
  { href: '/orders', label: 'Ordini', icon: Package },
];

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-border z-30 pb-safe">
      <div className="flex">
        {items.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex-1 flex flex-col items-center gap-1 py-3 text-xs transition-colors',
              pathname.startsWith(href)
                ? 'text-primary font-medium'
                : 'text-gray-400'
            )}
          >
            <Icon size={18} />
            <span>{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
