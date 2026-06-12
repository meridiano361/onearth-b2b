'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Grid3x3, Layers, Package2, ArrowLeft, ChevronRight } from 'lucide-react';
import { CATALOG_BRANCHES } from '@/lib/catalogBranches';

const CASA_BRANCH = CATALOG_BRANCHES.find((b) => b.id === 'casa27')!;

const NAV_ITEMS = [
  {
    href: '/moda/catalogo',
    icon: Grid3x3,
    label: 'Catalogo Moda',
    description: 'Sfoglia tutti i prodotti PE27',
    accent: '#1a1a1a',
  },
  {
    href: '/moda/looks',
    icon: Layers,
    label: 'Total Look',
    description: 'Outfit e abbinamenti curati',
    accent: '#2d1a4d',
  },
  {
    href: '/catalog/orders',
    icon: Package2,
    label: 'Ordini',
    description: 'Visualizza i tuoi ordini',
    accent: '#1a3a2d',
  },
];

export default function ModaHome() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <div className="px-6 pt-8 pb-6">
        <button
          onClick={() => router.push(CASA_BRANCH.rootRoute)}
          className="flex items-center gap-1.5 text-white/40 hover:text-white/70 transition-colors text-xs mb-8"
        >
          <ArrowLeft size={13} /> {CASA_BRANCH.label}
        </button>

        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/40 mb-2">Collezione</p>
          <h1 className="text-4xl font-light tracking-tight leading-none">
            Moda <span className="italic">PE27</span>
          </h1>
          <p className="text-white/40 text-sm mt-3 font-light">Primavera / Estate 2027</p>
        </div>
      </div>

      <div className="mx-6 h-px bg-white/10" />

      {/* Navigation cards */}
      <div className="px-6 py-8 space-y-3">
        {NAV_ITEMS.map(({ href, icon: Icon, label, description, accent }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-4 p-5 rounded-2xl border border-white/10 hover:border-white/25 bg-white/[0.03] hover:bg-white/[0.06] transition-all duration-200 group"
          >
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: accent + '60' }}
            >
              <Icon size={18} className="text-white/80" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white leading-none">{label}</p>
              <p className="text-xs text-white/40 mt-1">{description}</p>
            </div>
            <ChevronRight size={16} className="text-white/20 group-hover:text-white/50 transition-colors flex-shrink-0" />
          </Link>
        ))}
      </div>

      <div className="px-6 pb-10 pt-4">
        <div className="h-px bg-white/5 mb-6" />
        <p className="text-xs text-white/20 tracking-widest uppercase text-center">ON EARTH · B2B</p>
      </div>
    </div>
  );
}
