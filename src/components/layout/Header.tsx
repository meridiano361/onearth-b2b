'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { Session } from 'next-auth';
import { LogOut, UserCircle, HelpCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import NotificationBell from '@/components/layout/NotificationBell';
import { useSettings } from '@/contexts/SettingsContext';
import { isAdminRole } from '@/lib/roles';

const CASA_NAV_CONFIG: Record<string, { href: string; isActive: (p: string) => boolean }> = {
  catalogo:     { href: '/catalog/products',    isActive: (p) => p.startsWith('/catalog/products') },
  preferiti:    { href: '/catalog/preferiti',   isActive: (p) => p.startsWith('/catalog/preferiti') },
  carrelli:     { href: '/catalog/carts',       isActive: (p) => p.startsWith('/catalog/carts') },
  ordini:       { href: '/catalog/orders',      isActive: (p) => p.startsWith('/catalog/orders') },
  destinazioni: { href: '/catalog/destinazioni',isActive: (p) => p.startsWith('/catalog/destinazioni') },
  assistenza:   { href: '/catalog/assistenza',  isActive: (p) => p.startsWith('/catalog/assistenza') },
};

const MODA_NAV = [
  { key: 'catalogo',  href: '/moda/catalogo',      label: 'Catalogo',  isActive: (p: string) => p.startsWith('/moda/catalogo') },
  { key: 'preferiti', href: '/moda/preferiti',      label: 'Preferiti', isActive: (p: string) => p.startsWith('/moda/preferiti') },
  { key: 'carrelli',  href: '/moda/carrelli',       label: 'Carrelli',  isActive: (p: string) => p.startsWith('/moda/carrelli') },
  { key: 'ordini',    href: '/moda/ordini',         label: 'Ordini',    isActive: (p: string) => p.startsWith('/moda/ordini') },
  { key: 'assistenza',href: '/catalog/assistenza',  label: 'Aiuto',     isActive: (p: string) => p.startsWith('/catalog/assistenza') },
];

const MODA_VISUAL_ITEMS = [
  { href: '/moda/pareti',             label: 'Visual Parete',      isActive: (p: string) => p.startsWith('/moda/pareti') },
  { href: '/moda/visual/bigiotteria', label: 'Visual Bigiotteria', isActive: (p: string) => p.startsWith('/moda/visual') },
];

interface HeaderProps {
  session: Session;
}

export default function Header({ session }: HeaderProps) {
  const pathname = usePathname();
  const t = useTranslations('nav');
  const { menu } = useSettings();

  const isHome = pathname === '/home';
  const isInModa = pathname.startsWith('/moda');
  const isAdmin = isAdminRole(session.user.role);

  return (
    <header className="bg-white border-b border-border flex-shrink-0 z-10 pt-safe">
      <div className="h-14 flex items-center px-3 sm:px-6 gap-2 sm:gap-4 md:gap-6">
      {/* Logo */}
      <Link href="/home" className="flex items-center flex-shrink-0">
        <Image
          src="/logo-on-earth/onearth_solo.png"
          alt="On Earth"
          height={24}
          width={153}
          className="object-contain w-[110px] sm:w-[153px]"
          priority
        />
      </Link>

      {/* Nav links — desktop */}
      <nav className="hidden md:flex items-center gap-1">
        {isHome && (
          <Link
            href="/catalog/assistenza"
            className="text-xs px-3 py-1.5 rounded transition-colors text-gray-400 hover:text-primary hover:bg-cream"
          >
            Aiuto
          </Link>
        )}
        {!isHome && (isInModa
            ? <>
                {MODA_NAV.map(({ key, href, label, isActive }) => (
                  <Link
                    key={key}
                    href={href}
                    className={cn(
                      'text-xs px-3 py-1.5 rounded transition-colors',
                      isActive(pathname) ? 'text-primary font-semibold bg-cream' : 'text-gray-400 hover:text-primary hover:bg-cream'
                    )}
                  >
                    {label}
                  </Link>
                ))}
                {/* Visual dropdown — solo admin */}
                {isAdmin && <div className="relative group">
                  <button
                    className={cn(
                      'text-xs px-3 py-1.5 rounded transition-colors',
                      MODA_VISUAL_ITEMS.some((i) => i.isActive(pathname))
                        ? 'text-primary font-semibold bg-cream'
                        : 'text-gray-400 hover:text-primary hover:bg-cream'
                    )}
                  >
                    Visual
                  </button>
                  <div className="absolute top-full left-0 hidden group-hover:block bg-white shadow-lg border border-border rounded py-1 min-w-[168px] z-50">
                    {MODA_VISUAL_ITEMS.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          'block px-4 py-2 text-xs transition-colors',
                          item.isActive(pathname) ? 'text-primary font-semibold bg-cream' : 'text-gray-600 hover:text-primary hover:bg-cream'
                        )}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </div>}
              </>
            : menu.ordine
                .filter((key) => menu.items[key]?.visibile && CASA_NAV_CONFIG[key])
                .map((key) => {
                  const config = CASA_NAV_CONFIG[key];
                  const label = menu.items[key]?.label ?? key;
                  return (
                    <Link
                      key={key}
                      href={config.href}
                      className={cn(
                        'text-xs px-3 py-1.5 rounded transition-colors',
                        config.isActive(pathname) ? 'text-primary font-semibold bg-cream' : 'text-gray-400 hover:text-primary hover:bg-cream'
                      )}
                    >
                      {label}
                    </Link>
                  );
                }))}
        </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Notification bell */}
      <NotificationBell />

      {/* Aiuto — desktop only */}
      <Link
        href="/catalog/assistenza"
        className="hidden md:flex p-1.5 text-gray-400 hover:text-primary transition-colors"
        title="Aiuto"
        aria-label="Aiuto"
      >
        <HelpCircle size={19} />
      </Link>

      {/* Profilo mobile — icona */}
      <Link
        href="/catalog/impostazioni"
        className="sm:hidden p-1 text-gray-400 hover:text-primary transition-colors"
        title="Profilo"
      >
        <UserCircle size={22} />
      </Link>

      {/* Profilo desktop — nome + email */}
      <Link
        href="/catalog/impostazioni"
        className="hidden sm:flex flex-col items-end leading-tight hover:opacity-70 transition-opacity"
        title="Profilo"
      >
        <p className="text-xs font-medium text-primary truncate max-w-[160px]">
          {session.user.companyName}
        </p>
        <p className="text-2xs text-gray-400 truncate max-w-[160px]">
          {session.user.email}
        </p>
      </Link>

      {/* Esci */}
      <button
        onClick={() => signOut({ callbackUrl: '/login' })}
        className="p-1.5 text-gray-400 hover:text-primary transition-colors"
        title={t('logout')}
        aria-label={t('logout')}
      >
        <LogOut size={17} />
      </button>
      </div>
    </header>
  );
}
