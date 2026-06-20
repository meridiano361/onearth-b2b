'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { Session } from 'next-auth';
import { LogOut, Settings } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import LanguageSelector from '@/components/layout/LanguageSelector';
import NotificationBell from '@/components/layout/NotificationBell';
import { useSettings } from '@/contexts/SettingsContext';

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

interface HeaderProps {
  session: Session;
}

export default function Header({ session }: HeaderProps) {
  const pathname = usePathname();
  const t = useTranslations('nav');
  const { menu } = useSettings();

  const isHome = pathname === '/catalog' || pathname === '/home';
  const isInModa = pathname.startsWith('/moda');

  return (
    <header className="bg-white border-b border-border flex-shrink-0 z-10 pt-safe">
      <div className="h-14 flex items-center px-3 sm:px-6 gap-2 sm:gap-4 md:gap-6">
      {/* Logo */}
      <Link href="/catalog" className="flex items-center flex-shrink-0">
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
      {!isHome && (
        <nav className="hidden md:flex items-center gap-1">
          {isInModa
            ? MODA_NAV.map(({ key, href, label, isActive }) => (
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
              ))
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
                })}
        </nav>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Notification bell */}
      <NotificationBell />

      {/* Impostazioni */}
      <Link
        href="/catalog/impostazioni"
        className="p-1.5 text-gray-400 hover:text-primary transition-colors"
        aria-label="Impostazioni"
        title="Impostazioni"
      >
        <Settings size={17} className={pathname.startsWith('/catalog/impostazioni') ? 'text-primary' : ''} />
      </Link>

      {/* Language selector */}
      <LanguageSelector />

      {/* User info */}
      <div className="flex items-center gap-3">
        <div className="text-right hidden sm:block">
          <p className="text-xs font-medium text-primary truncate max-w-[160px]">
            {session.user.companyName}
          </p>
          <p className="text-2xs text-gray-400 truncate max-w-[160px]">
            {session.user.email}
          </p>
        </div>

        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-primary transition-colors px-2 py-2 rounded hover:bg-cream"
          title={t('logout')}
        >
          <LogOut size={14} />
          <span className="hidden sm:inline">{t('logout')}</span>
        </button>
      </div>
      </div>
    </header>
  );
}
