'use client';

import Link from 'next/link';
import { LayoutGrid, Heart, ShoppingCart, Package2, FileText, ImageIcon, Film, Clock, Lock } from 'lucide-react';
import { useSettings } from '@/contexts/SettingsContext';

function formatDeadline(iso: string): string {
  return new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
}

function NavCard({ href, icon: Icon, label }: { href: string; icon: React.ElementType; label: string }) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center justify-center gap-2.5 py-5 rounded-2xl border border-border bg-white hover:bg-cream hover:border-gray-300 transition-all duration-200 group"
    >
      <div className="w-9 h-9 rounded-xl bg-cream group-hover:bg-white flex items-center justify-center transition-colors">
        <Icon size={16} className="text-gray-500" />
      </div>
      <span className="text-xs font-medium text-primary tracking-wide">{label}</span>
    </Link>
  );
}

function ContentCard({ href, icon: Icon, label }: { href: string; icon: React.ElementType; label: string }) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center justify-center gap-2 py-4 rounded-2xl border border-border bg-white hover:bg-cream hover:border-gray-300 transition-all duration-200 group"
    >
      <Icon size={15} className="text-gray-400 group-hover:text-gray-600 transition-colors" />
      <span className="text-2xs font-medium text-gray-600 tracking-wide">{label}</span>
    </Link>
  );
}

export default function CasaHome() {
  const { collections } = useSettings();
  const casaInfo = collections.lista.find((c) => c.id === 'casa');
  const titolo = casaInfo?.titolo ?? 'Casa';
  const sottotitolo = casaInfo?.sottotitolo;
  const deadline = collections.casa.bookingDeadline;
  const isExpired = deadline ? new Date(deadline) < new Date() : false;

  return (
    <div className="min-h-screen bg-[#faf8f5] text-primary px-5 pt-8 pb-28">
      <p className="text-2xs tracking-[0.2em] uppercase text-gray-400">collezione</p>
      <h1 className="font-display text-4xl font-light tracking-widest leading-tight mt-0.5">{titolo.toUpperCase()}</h1>
      {sottotitolo && <p className="text-sm text-gray-400 mt-1">{sottotitolo}</p>}

      {deadline && (
        <div className={`mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
          isExpired
            ? 'bg-gray-100 text-gray-500'
            : 'bg-amber-50 text-amber-700 border border-amber-200'
        }`}>
          {isExpired ? <Lock size={10} /> : <Clock size={10} />}
          {isExpired
            ? `Prenotazioni chiuse il ${formatDeadline(deadline)}`
            : `Aperte fino al ${formatDeadline(deadline)}`}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 mt-8">
        <NavCard href="/catalog/products"  icon={LayoutGrid}   label="Catalogo"  />
        <NavCard href="/catalog/preferiti" icon={Heart}        label="Preferiti" />
        <NavCard href="/catalog/carts"     icon={ShoppingCart} label="Carrelli"  />
        <NavCard href="/catalog/orders"    icon={Package2}     label="Ordini"    />
      </div>

      <div className="grid grid-cols-3 gap-3 mt-3">
        <ContentCard href="/catalog/risorse" icon={FileText}  label="Documenti" />
        <ContentCard href="/catalog/risorse" icon={ImageIcon} label="Foto"      />
        <ContentCard href="/catalog/risorse" icon={Film}      label="Video"     />
      </div>
    </div>
  );
}
