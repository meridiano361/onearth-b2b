'use client';

import Link from 'next/link';
import { ArrowLeft, Film } from 'lucide-react';

export default function ModaRisorse() {
  return (
    <div className="min-h-screen bg-[#faf8f5]">
      <div className="px-4 pt-8 pb-4">
        <Link href="/moda" className="flex items-center gap-1.5 text-gray-400 hover:text-gray-600 transition-colors text-xs mb-8">
          <ArrowLeft size={13} /> MODA PE27
        </Link>
        <p className="text-xs tracking-[0.15em] text-gray-400 mb-1">collezione</p>
        <h1 className="font-display text-2xl font-light tracking-wide text-primary">Risorse e media</h1>
      </div>

      <div className="mx-4 h-px bg-border mb-8" />

      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <Film size={36} className="text-gray-200 mb-4" />
        <p className="text-sm font-medium text-gray-500">Nessuna risorsa disponibile</p>
        <p className="text-xs text-gray-400 mt-1">Documenti, foto e video verranno pubblicati qui</p>
      </div>
    </div>
  );
}
