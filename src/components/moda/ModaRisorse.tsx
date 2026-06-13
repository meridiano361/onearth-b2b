'use client';

import Link from 'next/link';
import { ArrowLeft, Film } from 'lucide-react';

export default function ModaRisorse() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="sticky top-0 z-10 bg-[#0a0a0a]/95 backdrop-blur-sm px-4 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <Link href="/moda" className="text-white/40 hover:text-white/70 transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <p className="text-xs text-white/40 uppercase tracking-widest">Moda PE27</p>
            <p className="text-sm font-medium">Risorse e media</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center py-32 px-4 text-center">
        <Film size={36} className="text-white/10 mb-4" />
        <p className="text-sm font-medium text-white/30">Nessuna risorsa disponibile</p>
        <p className="text-xs text-white/20 mt-1">Documenti, foto e video verranno pubblicati qui</p>
      </div>
    </div>
  );
}
