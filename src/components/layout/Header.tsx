'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { Session } from 'next-auth';
import { LogOut, HelpCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import LanguageSelector from '@/components/layout/LanguageSelector';

interface HeaderProps {
  session: Session;
}

export default function Header({ session }: HeaderProps) {
  const pathname = usePathname();
  const t = useTranslations('nav');

  return (
    <header className="h-14 bg-white border-b border-border flex items-center px-4 sm:px-6 gap-3 sm:gap-6 flex-shrink-0 z-10">
      {/* Logo */}
      <Link href="/catalog" className="flex items-center flex-shrink-0">
        <Image
          src="/logo-on-earth/onearth_solo.png"
          alt="On Earth"
          height={24}
          width={153}
          className="object-contain"
          priority
        />
      </Link>

      {/* Divider + Collection badge — hidden on small phones */}
      <div className="hidden sm:flex items-center gap-3">
        <div className="h-5 w-px bg-border" />
        <span className="text-2xs tracking-widest uppercase text-gray-400 font-medium">
          CASA 2027
        </span>
      </div>

      {/* Nav links — desktop */}
      <nav className="hidden md:flex items-center gap-1">
        <Link
          href="/catalog"
          className={cn(
            'text-xs px-3 py-1.5 rounded transition-colors',
            pathname === '/catalog' || (pathname.startsWith('/catalog') && !pathname.startsWith('/catalog/orders') && !pathname.startsWith('/catalog/assistenza'))
              ? 'text-primary font-semibold bg-cream'
              : 'text-gray-400 hover:text-primary hover:bg-cream'
          )}
        >
          {t('catalog')}
        </Link>
        <Link
          href="/catalog/orders"
          className={cn(
            'text-xs px-3 py-1.5 rounded transition-colors',
            pathname.startsWith('/catalog/orders')
              ? 'text-primary font-semibold bg-cream'
              : 'text-gray-400 hover:text-primary hover:bg-cream'
          )}
        >
          {t('orders')}
        </Link>
        <Link
          href="/catalog/canali"
          className={cn(
            'text-xs px-3 py-1.5 rounded transition-colors',
            pathname.startsWith('/catalog/canali')
              ? 'text-primary font-semibold bg-cream'
              : 'text-gray-400 hover:text-primary hover:bg-cream'
          )}
        >
          {t('channels')}
        </Link>
        <Link
          href="/catalog/assistenza"
          className={cn(
            'text-xs px-3 py-1.5 rounded transition-colors flex items-center gap-1',
            pathname.startsWith('/catalog/assistenza')
              ? 'text-primary font-semibold bg-cream'
              : 'text-gray-400 hover:text-primary hover:bg-cream'
          )}
        >
          <HelpCircle size={12} />
          {t('assistance')}
        </Link>
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Language selector */}
      <LanguageSelector />

      {/* User info */}
      <div className="flex items-center gap-3">
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
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-primary transition-colors px-2 py-2 rounded hover:bg-cream"
          title={t('logout')}
        >
          <LogOut size={14} />
          <span className="hidden sm:inline">{t('logout')}</span>
        </button>
      </div>
    </header>
  );
}
