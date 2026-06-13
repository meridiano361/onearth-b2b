'use client';

import Link from 'next/link';
import { Grid3x3, Heart, ShoppingCart, Package2, HelpCircle, ArrowLeft, ChevronRight } from 'lucide-react';

const COLLECTION_ITEMS = [
  { href: '/moda/catalogo',  icon: Grid3x3,     label: 'Catalogo',  description: 'Sfoglia tutti i prodotti PE27' },
  { href: '/moda/preferiti', icon: Heart,        label: 'Preferiti', description: 'I tuoi prodotti preferiti'     },
  { href: '/moda/carrelli',  icon: ShoppingCart, label: 'Carrelli',  description: 'I tuoi carrelli attivi'        },
  { href: '/moda/ordini',    icon: Package2,     label: 'Ordini',    description: 'I tuoi ordini PE27'            },
];

export default function ModaHome() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <div className="px-5 pt-8 pb-6">
        <Link href="/catalog" className="flex items-center gap-1.5 text-white/40 hover:text-white/70 transition-colors text-xs mb-8">
          <ArrowLeft size={13} /> Home
        </Link>
        <p className="text-xs uppercase tracking-[0.3em] text-white/40 mb-2">Collezione</p>
        <h1 className="text-3xl font-light tracking-tight leading-none">
          Moda <span className="italic">PE27</span>
        </h1>
      </div>

      <div className="mx-5 h-px bg-white/10" />

      {/* Collection nav */}
      <div className="px-5 py-6 space-y-2">
        {COLLECTION_ITEMS.map(({ href, icon: Icon, label, description }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-4 p-4 rounded-2xl border border-white/10 hover:border-white/25 bg-white/[0.03] hover:bg-white/[0.06] transition-all duration-200 group"
          >
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
              <Icon size={16} className="text-white/70" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white leading-none">{label}</p>
              <p className="text-xs text-white/40 mt-1">{description}</p>
            </div>
            <ChevronRight size={15} className="text-white/20 group-hover:text-white/50 transition-colors flex-shrink-0" />
          </Link>
        ))}
      </div>

      <div className="mx-5 h-px bg-white/5" />

      {/* Aiuto — condiviso */}
      <div className="px-5 py-4">
        <Link
          href="/catalog/assistenza"
          className="flex items-center gap-4 p-4 rounded-2xl border border-white/10 hover:border-white/25 bg-white/[0.03] hover:bg-white/[0.06] transition-all duration-200 group"
        >
          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
            <HelpCircle size={16} className="text-white/70" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white leading-none">Aiuto</p>
            <p className="text-xs text-white/40 mt-1">Guide e supporto</p>
          </div>
          <ChevronRight size={15} className="text-white/20 group-hover:text-white/50 transition-colors flex-shrink-0" />
        </Link>
      </div>
    </div>
  );
}
