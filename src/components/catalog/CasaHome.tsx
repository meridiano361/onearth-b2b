'use client';

import Link from 'next/link';
import { Grid3x3, Heart, ShoppingCart, Package2, HelpCircle, ArrowLeft, ChevronRight } from 'lucide-react';

const COLLECTION_ITEMS = [
  { href: '/catalog/products',  icon: Grid3x3,     label: 'Catalogo',  description: 'Sfoglia tutti i prodotti Casa 2027' },
  { href: '/catalog/preferiti', icon: Heart,        label: 'Preferiti', description: 'I tuoi prodotti preferiti'          },
  { href: '/catalog/carts',     icon: ShoppingCart, label: 'Carrelli',  description: 'I tuoi carrelli attivi'             },
  { href: '/catalog/orders',    icon: Package2,     label: 'Ordini',    description: 'I tuoi ordini'                      },
];

export default function CasaHome() {
  return (
    <div className="min-h-screen bg-[#faf8f5] text-primary">
      {/* Header */}
      <div className="px-5 pt-8 pb-6">
        <Link href="/catalog" className="flex items-center gap-1.5 text-gray-400 hover:text-gray-600 transition-colors text-xs mb-8">
          <ArrowLeft size={13} /> Home
        </Link>
        <p className="text-xs uppercase tracking-[0.3em] text-gray-400 mb-2">Collezione</p>
        <h1 className="font-display text-3xl font-light tracking-wide leading-none text-primary">
          Casa 2027
        </h1>
      </div>

      <div className="mx-5 h-px bg-border" />

      {/* Collection nav */}
      <div className="px-5 py-6 space-y-2">
        {COLLECTION_ITEMS.map(({ href, icon: Icon, label, description }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-4 p-4 rounded-2xl border border-border hover:border-primary/30 bg-white hover:bg-cream transition-all duration-200 group shadow-sm"
          >
            <div className="w-10 h-10 rounded-xl bg-cream flex items-center justify-center flex-shrink-0">
              <Icon size={16} className="text-gray-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-primary leading-none">{label}</p>
              <p className="text-xs text-gray-400 mt-1">{description}</p>
            </div>
            <ChevronRight size={15} className="text-gray-300 group-hover:text-primary transition-colors flex-shrink-0" />
          </Link>
        ))}
      </div>

      <div className="mx-5 h-px bg-border" />

      {/* Aiuto — condiviso */}
      <div className="px-5 py-4">
        <Link
          href="/catalog/assistenza"
          className="flex items-center gap-4 p-4 rounded-2xl border border-border hover:border-primary/30 bg-white hover:bg-cream transition-all duration-200 group shadow-sm"
        >
          <div className="w-10 h-10 rounded-xl bg-cream flex items-center justify-center flex-shrink-0">
            <HelpCircle size={16} className="text-gray-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-primary leading-none">Aiuto</p>
            <p className="text-xs text-gray-400 mt-1">Guide e supporto</p>
          </div>
          <ChevronRight size={15} className="text-gray-300 group-hover:text-primary transition-colors flex-shrink-0" />
        </Link>
      </div>
    </div>
  );
}
