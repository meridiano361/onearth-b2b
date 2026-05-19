'use client';

import { useMemo } from 'react';
import { RotateCcw, Globe } from 'lucide-react';
import { useTranslations } from 'next-intl';
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
  selectedTranche: string | null;
  onTrancheChange: (v: string | null) => void;
  hasActiveFilters: boolean;
  onResetAll: () => void;
}

function opts(products: Product[], field: keyof Product): string[] {
  return [...new Set(products.map((p) => p[field]).filter(Boolean) as string[])].sort();
}

function FilterSelect({
  label,
  allLabel,
  value,
  options,
  onChange,
}: {
  label: string;
  allLabel: string;
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
        <option value="">{allLabel}</option>
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
  selectedTranche,            onTrancheChange,
  hasActiveFilters,           onResetAll,
}: CatalogFiltersProps) {
  const t = useTranslations('filters');

  const gruppoMerceologicoOpts = useMemo(() => opts(products, 'gruppoMerceologico'), [products]);
  const famigliaOpts           = useMemo(() => opts(products, 'famiglia'),           [products]);
  const classeOpts             = useMemo(() => opts(products, 'classe'),             [products]);
  const sottoclasseOpts        = useMemo(() => opts(products, 'sottoclasse'),        [products]);
  const gruppoOmogeneoOpts     = useMemo(() => opts(products, 'gruppoOmogeneo'),     [products]);
  const nomLineaOpts           = useMemo(() => opts(products, 'nomLinea'),           [products]);
  const coloreOpts             = useMemo(() => opts(products, 'colore'),             [products]);
  const collezioneOpts         = useMemo(() => opts(products, 'collezione'),         [products]);
  const produttoreOpts         = useMemo(() => opts(products, 'produttore'),         [products]);
  const trancheOpts            = useMemo(() => opts(products, 'tranche'),            [products]);

  return (
    <div className="w-56 flex-shrink-0 border-r border-border bg-white flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4">

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <span className="label-luxury">{t('title')}</span>
          {hasActiveFilters && (
            <button
              onClick={onResetAll}
              className="flex items-center gap-1 text-2xs text-accent hover:text-primary font-medium transition-colors"
            >
              <RotateCcw size={10} />
              {t('resetAll')}
            </button>
          )}
        </div>

        <FilterSelect label={t('gruppoMerceologico')} allLabel={t('all')} value={selectedGruppoMerceologico} options={gruppoMerceologicoOpts} onChange={onGruppoMerceologicoChange} />
        <FilterSelect label={t('famiglia')}           allLabel={t('all')} value={selectedFamiglia}           options={famigliaOpts}           onChange={onFamigliaChange} />
        <FilterSelect label={t('classe')}             allLabel={t('all')} value={selectedClasse}             options={classeOpts}             onChange={onClasseChange} />
        <FilterSelect label={t('sottoclasse')}        allLabel={t('all')} value={selectedSottoclasse}        options={sottoclasseOpts}        onChange={onSottoclasseChange} />
        <FilterSelect label={t('gruppoOmogeneo')}     allLabel={t('all')} value={selectedGruppoOmogeneo}     options={gruppoOmogeneoOpts}     onChange={onGruppoOmogeneoChange} />
        <FilterSelect label={t('linea')}              allLabel={t('all')} value={selectedNomLinea}           options={nomLineaOpts}           onChange={onNomLineaChange} />
        <FilterSelect label={t('colore')}             allLabel={t('all')} value={selectedColore}             options={coloreOpts}             onChange={onColoreChange} />
        <FilterSelect label={t('collezione')}         allLabel={t('all')} value={selectedCollezione}         options={collezioneOpts}         onChange={onCollezioneChange} />
        <FilterSelect label={t('produttore')}         allLabel={t('all')} value={selectedProduttore}         options={produttoreOpts}         onChange={onProduttoreChange} />
        <FilterSelect label={t('tranche')}            allLabel={t('all')} value={selectedTranche}            options={trancheOpts}            onChange={onTrancheChange} />

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

        {/* Social icons */}
        <div className="flex items-center gap-3 pt-1">
          <a
            href="https://www.facebook.com/onearthofficial/"
            target="_blank"
            rel="noopener noreferrer"
            className="opacity-70 hover:opacity-100 transition-opacity"
            aria-label="Facebook"
          >
            <svg viewBox="0 0 24 24" fill="#1877F2" className="w-5 h-5">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
          </a>
          <a
            href="https://www.instagram.com/onearth_official/"
            target="_blank"
            rel="noopener noreferrer"
            className="opacity-70 hover:opacity-100 transition-opacity"
            aria-label="Instagram"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5">
              <defs>
                <linearGradient id="ig-grad" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" style={{stopColor:'#f09433'}} />
                  <stop offset="25%" style={{stopColor:'#e6683c'}} />
                  <stop offset="50%" style={{stopColor:'#dc2743'}} />
                  <stop offset="75%" style={{stopColor:'#cc2366'}} />
                  <stop offset="100%" style={{stopColor:'#bc1888'}} />
                </linearGradient>
              </defs>
              <path fill="url(#ig-grad)" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}
