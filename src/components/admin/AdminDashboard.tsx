'use client';

import Link from 'next/link';
import {
  ShoppingCart, Users, Package, MessageSquare, BarChart2, BookOpen,
  Layers, FileText, Image as ImageIcon, Bell, Paintbrush, Eye,
  UserPlus, Settings, ArrowRight,
} from 'lucide-react';

const NAV_CARDS = [
  { href: '/admin/analytics',        label: 'Analisi',            description: 'Report vendite, clienti e performance',          icon: BarChart2,     color: 'bg-emerald-50 text-emerald-600' },
  { href: '/admin/anteprima',        label: 'Anteprima',          description: "Visualizza l'app come la vedono i clienti",       icon: Eye,           color: 'bg-indigo-50 text-indigo-600'   },
  { href: '/admin/catalogo-pdf',     label: 'Catalogo PDF',       description: 'Genera e scarica il catalogo in PDF',             icon: BookOpen,      color: 'bg-lime-50 text-lime-600'       },
  { href: '/admin/classificazione',  label: 'Classificazione',    description: 'Gestisci linee, collezioni e categorie',          icon: Layers,        color: 'bg-cyan-50 text-cyan-600'       },
  { href: '/admin/customers',        label: 'Clienti',            description: 'Lista organizzazioni e accessi',                  icon: Users,         color: 'bg-teal-50 text-teal-600'       },
  { href: '/admin/documenti',        label: 'Documenti',          description: 'Documenti e risorse per i clienti',               icon: FileText,      color: 'bg-yellow-50 text-yellow-600'   },
  { href: '/admin/foto',             label: 'Foto',               description: 'Carica e ottimizza le immagini prodotto',         icon: ImageIcon,     color: 'bg-pink-50 text-pink-600'       },
  { href: '/admin/impostazioni',     label: 'Impostazioni',       description: "Configurazione avanzata dell'app",                icon: Settings,      color: 'bg-gray-100 text-gray-600'      },
  { href: '/admin/notifiche',        label: 'Notifiche',          description: 'Invia notifiche push ai clienti',                 icon: Bell,          color: 'bg-rose-50 text-rose-600'       },
  { href: '/admin/orders',           label: 'Ordini',             description: 'Visualizza e gestisci gli ordini dei clienti',    icon: ShoppingCart,  color: 'bg-blue-50 text-blue-600'       },
  { href: '/admin/personalizzazione',label: 'Personalizzazione',  description: 'Homepage, colori, collezioni e messaggi',         icon: Paintbrush,    color: 'bg-violet-50 text-violet-600'   },
  { href: '/admin/products',         label: 'Prodotti',           description: 'Catalogo, prezzi, foto e importazione',           icon: Package,       color: 'bg-amber-50 text-amber-600'     },
  { href: '/admin/access-requests',  label: 'Richieste accesso',  description: 'Approva o rifiuta nuove registrazioni',           icon: UserPlus,      color: 'bg-orange-50 text-orange-600'   },
  { href: '/admin/sondaggi',         label: 'Sondaggi',           description: 'Crea sondaggi e raccogli risposte',               icon: MessageSquare, color: 'bg-purple-50 text-purple-600'   },
] as const;

export default function AdminDashboard() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl">
      <div className="mb-8">
        <p className="label-luxury text-accent mb-1">Meridiano 361</p>
        <h1 className="font-display text-3xl text-primary font-light">Home</h1>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {NAV_CARDS.map(({ href, label, description, icon: Icon, color }) => (
          <Link
            key={href}
            href={href}
            className="group bg-white border border-border rounded-xl p-4 hover:shadow-luxury transition-all duration-200 flex flex-col gap-3"
          >
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
              <Icon size={17} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-primary leading-snug">{label}</p>
              <p className="text-2xs text-gray-400 mt-0.5 leading-relaxed">{description}</p>
            </div>
            <ArrowRight size={12} className="text-gray-300 group-hover:text-gray-500 transition-colors self-end" />
          </Link>
        ))}
      </div>
    </div>
  );
}
