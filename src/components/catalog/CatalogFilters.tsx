'use client';

import { useMemo } from 'react';
import { RotateCcw, Globe } from 'lucide-react';
import type { Product } from '@/types';

interface CatalogFiltersProps {
  products: Product[];
  selectedGruppoMerceologico: string | null;
  onGruppoMerceologicoChange: (v: string | null) => void;
  selectedFamiglia: string | null;
  onFamigliaChange: (v: string | null) => void;
  selectedClasse: string | null;
  onClasseChange: (v: string | null) => void;
  selectedSottoclasse: string | null;
  onSottoclasseChange: (v: string | null) => void;
  selectedGruppoOmogeneo: string | null;
  onGruppoOmogeneoChange: (v: string | null) => void;
  selectedNomLinea: string | null;
  onNomLineaChange: (v: string | null) => void;
  selectedColore: string | null;
  onColoreChange: (v: string | null) => void;
  selectedCollezione: string | null;
  onCollezioneChange: (v: string | null) => void;
  selectedProduttore: string | null;
  onProduttoreChange: (v: string | null) => void;
  hasActiveFilters: boolean;
  onResetAll: () => void;
}

function opts(products: Product[], field: keyof Product): string[] {
  return [...new Set(products.map((p) => p[field]).filter(Boolean) as string[])].sort();
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string | null;
  options: string[];
  onChange: (v: string | null) => void;
}) {
  if (options.length === 0) return null;
  return (
    <div className="mb-3">
      <label className="block text-2xs text-gray-400 uppercase tracking-wider mb-1">{label}</label>
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
        className="w-full text-xs border border-border rounded px-2 py-1.5 text-primary bg-white focus:outline-none focus:border-accent transition-colors cursor-pointer"
      >
        <option value="">Tutti</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}

export default function CatalogFilters({
  products,
  selectedGruppoMerceologico, onGruppoMerceologicoChange,
  selectedFamiglia,           onFamigliaChange,
  selectedClasse,             onClasseChange,
  selectedSottoclasse,        onSottoclasseChange,
  selectedGruppoOmogeneo,     onGruppoOmogeneoChange,
  selectedNomLinea,           onNomLineaChange,
  selectedColore,             onColoreChange,
  selectedCollezione,         onCollezioneChange,
  selectedProduttore,         onProduttoreChange,
  hasActiveFilters,           onResetAll,
}: CatalogFiltersProps) {
  const gruppoMerceologicoOpts = useMemo(() => opts(products, 'gruppoMerceologico'), [products]);
  const famigliaOpts           = useMemo(() => opts(products, 'famiglia'),           [products]);
  const classeOpts             = useMemo(() => opts(products, 'classe'),             [products]);
  const sottoclasseOpts        = useMemo(() => opts(products, 'sottoclasse'),        [products]);
  const gruppoOmogeneoOpts     = useMemo(() => opts(products, 'gruppoOmogeneo'),     [products]);
  const nomLineaOpts           = useMemo(() => opts(products, 'nomLinea'),           [products]);
  const coloreOpts             = useMemo(() => opts(products, 'colore'),             [products]);
  const collezioneOpts         = useMemo(() => opts(products, 'collezione'),         [products]);
  const produttoreOpts         = useMemo(() => opts(products, 'produttore'),         [products]);

  return (
    <div className="w-56 flex-shrink-0 border-r border-border bg-white flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4">

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <span className="label-luxury">Filtri</span>
          {hasActiveFilters && (
            <button
              onClick={onResetAll}
              className="flex items-center gap-1 text-2xs text-accent hover:text-primary font-medium transition-colors"
            >
              <RotateCcw size={10} />
              Azzera tutti
            </button>
          )}
        </div>

        <FilterSelect label="Gruppo merceologico" value={selectedGruppoMerceologico} options={gruppoMerceologicoOpts} onChange={onGruppoMerceologicoChange} />
        <FilterSelect label="Famiglia"             value={selectedFamiglia}           options={famigliaOpts}           onChange={onFamigliaChange} />
        <FilterSelect label="Classe"               value={selectedClasse}             options={classeOpts}             onChange={onClasseChange} />
        <FilterSelect label="Sottoclasse"          value={selectedSottoclasse}        options={sottoclasseOpts}        onChange={onSottoclasseChange} />
        <FilterSelect label="Gruppo omogeneo"      value={selectedGruppoOmogeneo}     options={gruppoOmogeneoOpts}     onChange={onGruppoOmogeneoChange} />
        <FilterSelect label="Linea"                value={selectedNomLinea}           options={nomLineaOpts}           onChange={onNomLineaChange} />
        <FilterSelect label="Colore"               value={selectedColore}             options={coloreOpts}             onChange={onColoreChange} />
        <FilterSelect label="Collezione"           value={selectedCollezione}         options={collezioneOpts}         onChange={onCollezioneChange} />
        <FilterSelect label="Produttore"           value={selectedProduttore}         options={produttoreOpts}         onChange={onProduttoreChange} />

      </div>

      {/* ── Footer links ─────────────────────────────────── */}
      <div className="flex-shrink-0 border-t border-border/60 px-3 py-3 space-y-2">
        <a
          href="https://open.spotify.com/show/3MjWJeGlQFAy2D2D2awo4t"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-start gap-2.5 bg-black rounded-lg px-3 py-2.5 hover:opacity-80 hover:ring-1 hover:ring-[#1DB954]/60 transition-all"
        >
          <svg viewBox="0 0 24 24" fill="#1DB954" className="w-5 h-5 flex-shrink-0 mt-0.5">
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
          </svg>
          <p className="text-xs text-white leading-snug">
            Ascolta &ldquo;Materia&rdquo; il podcast di ON EARTH: spunti per abitare il mondo con cura.
          </p>
        </a>

        <a
          href="https://www.on-earth.it"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          <Globe size={12} className="flex-shrink-0" />
          <span>www.on-earth.it</span>
        </a>
      </div>
    </div>
  );
}
