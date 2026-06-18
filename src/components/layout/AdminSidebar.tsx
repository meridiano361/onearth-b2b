'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import {
  LayoutDashboard,
  Package,
  Users,
  ShoppingCart,
  Layers,
  LogOut,
  Settings,
  X,
  UserPlus,
  Eye,
  FileText,
  Image as ImageIcon,
  BookOpen,
  Paintbrush,
  Bell,
  BarChart2,
  Sparkles,
  MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  exact?: boolean;
  roles?: string[]; // undefined = all admin roles
}

const NAV_ITEMS: NavItem[] = [
  { href: '/admin',                  label: 'Dashboard',          icon: LayoutDashboard, exact: true },
  { href: '/admin/orders',           label: 'Ordini',             icon: ShoppingCart,    roles: ['SUPER_ADMIN', 'ADMIN', 'COMMERCIALE'] },
  { href: '/admin/products',         label: 'Prodotti',           icon: Package,         roles: ['SUPER_ADMIN', 'ADMIN', 'MAGAZZINO', 'COMMERCIALE'] },
  { href: '/admin/customers',        label: 'Clienti',            icon: Users,           roles: ['SUPER_ADMIN', 'ADMIN', 'COMMERCIALE'] },
  { href: '/admin/classificazione',  label: 'Classificazione',    icon: Layers,          roles: ['SUPER_ADMIN', 'ADMIN', 'MAGAZZINO'] },
  { href: '/admin/access-requests',  label: 'Richieste Accesso',  icon: UserPlus,        roles: ['SUPER_ADMIN', 'ADMIN'] },
  { href: '/admin/documenti',        label: 'Documenti',          icon: FileText,        roles: ['SUPER_ADMIN', 'ADMIN'] },
  { href: '/admin/foto',             label: 'Foto',               icon: ImageIcon,       roles: ['SUPER_ADMIN', 'ADMIN'] },
  { href: '/admin/catalogo-pdf',     label: 'Catalogo PDF',       icon: BookOpen,        roles: ['SUPER_ADMIN', 'ADMIN'] },
  { href: '/admin/preview',          label: 'Anteprima cliente',  icon: Eye,             roles: ['SUPER_ADMIN', 'ADMIN'] },
  { href: '/admin/notifiche',         label: 'Notifiche',          icon: Bell,            roles: ['SUPER_ADMIN', 'ADMIN'] },
  { href: '/admin/recensioni',        label: 'Recensioni',         icon: MessageSquare,   roles: ['SUPER_ADMIN', 'ADMIN'] },
  { href: '/admin/analytics',         label: 'Analytics',          icon: BarChart2,       roles: ['SUPER_ADMIN', 'ADMIN'] },
  { href: '/admin/personalizzazione', label: 'Personalizzazione', icon: Paintbrush,      roles: ['SUPER_ADMIN'] },
  { href: '/admin/impostazioni',     label: 'Impostazioni',       icon: Settings,        roles: ['SUPER_ADMIN'] },
];

interface AdminSidebarProps {
  onClose?: () => void;
}

export default function AdminSidebar({ onClose }: AdminSidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = session?.user?.role ?? '';

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.roles || item.roles.includes(role)
  );

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + '/');
  }

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
        {visibleItems.map(({ href, label, icon: Icon, exact }) => (
          <Link
            key={href}
            href={href}
            onClick={onClose}
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

      {/* Footer: role badge + preview links + logout */}
      <div className="px-3 py-4 border-t border-white/10 space-y-1">
        {role && role !== 'CUSTOMER' && (
          <p className="px-3 text-2xs text-gray-600 uppercase tracking-widest mb-2">{role.replace('_', ' ')}</p>
        )}

        {/* Anteprima app attuale — impersona un cliente */}
        <Link
          href="/admin/preview"
          onClick={onClose}
          className="flex items-start gap-3 px-3 py-2.5 w-full rounded text-xs text-gray-500 hover:text-white hover:bg-white/5 transition-all duration-150"
        >
          <Eye size={15} className="flex-shrink-0 mt-px" />
          <span className="leading-tight">
            Anteprima app attuale
            <span className="block text-2xs text-gray-700 mt-0.5">come la vede il cliente</span>
          </span>
        </Link>

        {/* Anteprima nuova app — landing sperimentale admin */}
        <a
          href="/catalog"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-start gap-3 px-3 py-2.5 w-full rounded text-xs text-gray-500 hover:text-white hover:bg-white/5 transition-all duration-150"
        >
          <Sparkles size={15} className="flex-shrink-0 mt-px" />
          <span className="leading-tight">
            Anteprima nuova app
            <span className="block text-2xs text-gray-700 mt-0.5">nascosta, in sviluppo</span>
          </span>
        </a>

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
