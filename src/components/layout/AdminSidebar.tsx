'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import {
  LayoutDashboard, Package, Users, ShoppingCart, Layers,
  LogOut, Settings, X, UserPlus, Eye, FileText,
  Image as ImageIcon, BookOpen, Paintbrush, Bell,
  BarChart2, Sparkles, MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  exact?: boolean;
  roles?: string[];
  external?: boolean;
}

interface NavGroup {
  groupLabel: string;
  icon: React.ElementType;
  roles?: string[];
  items: NavItem[];
}

type NavEntry = NavItem | NavGroup;

function isGroup(e: NavEntry): e is NavGroup {
  return 'groupLabel' in e;
}

// Alphabetical order (Italian labels)
const NAV: NavEntry[] = [
  { href: '/admin/analytics',        label: 'Analisi',           icon: BarChart2,       roles: ['SUPER_ADMIN', 'ADMIN'] },
  {
    groupLabel: 'Anteprima',
    icon: Eye,
    roles: ['SUPER_ADMIN', 'ADMIN'],
    items: [
      { href: '/admin/preview', label: 'App attuale', icon: Eye,      roles: ['SUPER_ADMIN', 'ADMIN'] },
      { href: '/catalog',       label: 'Nuova app',   icon: Sparkles, roles: ['SUPER_ADMIN', 'ADMIN'], external: true },
    ],
  },
  { href: '/admin/catalogo-pdf',     label: 'Catalogo PDF',      icon: BookOpen,        roles: ['SUPER_ADMIN', 'ADMIN'] },
  { href: '/admin/classificazione',  label: 'Classificazione',   icon: Layers,          roles: ['SUPER_ADMIN', 'ADMIN', 'MAGAZZINO'] },
  {
    groupLabel: 'Clienti',
    icon: Users,
    roles: ['SUPER_ADMIN', 'ADMIN', 'COMMERCIALE'],
    items: [
      { href: '/admin/customers',       label: 'Lista clienti',     icon: Users,     roles: ['SUPER_ADMIN', 'ADMIN', 'COMMERCIALE'] },
      { href: '/admin/access-requests', label: 'Richieste accesso', icon: UserPlus,  roles: ['SUPER_ADMIN', 'ADMIN'] },
    ],
  },
  { href: '/admin',                  label: 'Dashboard',         icon: LayoutDashboard, exact: true },
  { href: '/admin/documenti',        label: 'Documenti',         icon: FileText,        roles: ['SUPER_ADMIN', 'ADMIN'] },
  { href: '/admin/foto',             label: 'Foto',              icon: ImageIcon,       roles: ['SUPER_ADMIN', 'ADMIN'] },
  { href: '/admin/impostazioni',     label: 'Impostazioni',      icon: Settings,        roles: ['SUPER_ADMIN'] },
  { href: '/admin/notifiche',        label: 'Notifiche',         icon: Bell,            roles: ['SUPER_ADMIN', 'ADMIN'] },
  { href: '/admin/orders',           label: 'Ordini',            icon: ShoppingCart,    roles: ['SUPER_ADMIN', 'ADMIN', 'COMMERCIALE'] },
  { href: '/admin/personalizzazione',label: 'Personalizzazione', icon: Paintbrush,      roles: ['SUPER_ADMIN'] },
  { href: '/admin/products',         label: 'Prodotti',          icon: Package,         roles: ['SUPER_ADMIN', 'ADMIN', 'MAGAZZINO', 'COMMERCIALE'] },
  { href: '/admin/sondaggi',         label: 'Sondaggi',          icon: MessageSquare,   roles: ['SUPER_ADMIN', 'ADMIN'] },
];

interface AdminSidebarProps {
  onClose?: () => void;
}

export default function AdminSidebar({ onClose }: AdminSidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = session?.user?.role ?? '';

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + '/');
  }

  function canSee(roles?: string[]) {
    return !roles || roles.includes(role);
  }

  const linkClass = (active: boolean) =>
    cn(
      'flex items-center gap-3 px-3 py-2.5 rounded text-xs font-medium transition-all duration-150',
      active ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'
    );

  return (
    <aside className="w-56 bg-primary flex flex-col h-full flex-shrink-0">
      {/* Brand */}
      <div className="px-6 py-6 border-b border-white/10 flex items-start justify-between">
        <div>
          <Image
            src="/logo-on-earth/onearth_solo_bianco.png"
            alt="On Earth"
            height={24}
            width={154}
            className="object-contain mb-2"
            priority
          />
          <p className="text-2xs text-gray-600 uppercase tracking-widest">Amministrazione</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden text-gray-500 hover:text-white transition-colors -mt-1 -mr-2 p-1"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV.map((entry) => {
          if (isGroup(entry)) {
            if (!canSee(entry.roles)) return null;
            const visibleItems = entry.items.filter((i) => canSee(i.roles));
            if (visibleItems.length === 0) return null;
            const groupActive = visibleItems.some((i) => isActive(i.href, i.exact));
            return (
              <div key={entry.groupLabel}>
                <p className={cn(
                  'flex items-center gap-3 px-3 py-2.5 text-xs font-medium',
                  groupActive ? 'text-white' : 'text-gray-500'
                )}>
                  <entry.icon size={15} />
                  {entry.groupLabel}
                </p>
                <div className="ml-3 pl-3 border-l border-white/10 space-y-0.5">
                  {visibleItems.map((item) => {
                    const active = isActive(item.href, item.exact);
                    if (item.external) {
                      return (
                        <a
                          key={item.href}
                          href={item.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={onClose}
                          className={linkClass(active)}
                        >
                          <item.icon size={13} />
                          {item.label}
                        </a>
                      );
                    }
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onClose}
                        className={linkClass(active)}
                      >
                        <item.icon size={13} />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          }

          if (!canSee(entry.roles)) return null;
          return (
            <Link
              key={entry.href}
              href={entry.href}
              onClick={onClose}
              className={linkClass(isActive(entry.href, entry.exact))}
            >
              <entry.icon size={15} />
              {entry.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer: role badge + logout */}
      <div className="px-3 py-4 border-t border-white/10 space-y-1">
        {role && role !== 'CUSTOMER' && (
          <p className="px-3 text-2xs text-gray-600 uppercase tracking-widest mb-2">{role.replace('_', ' ')}</p>
        )}
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
