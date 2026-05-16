'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { Session } from 'next-auth';
import { LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface HeaderProps {
  session: Session;
}

export default function Header({ session }: HeaderProps) {
  const pathname = usePathname();

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

      {/* Spacer */}
      <div className="flex-1" />

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
          title="Esci"
        >
          <LogOut size={14} />
          <span className="hidden sm:inline">Esci</span>
        </button>
      </div>
    </header>
  );
}
