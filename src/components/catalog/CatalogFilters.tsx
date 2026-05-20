'use client';

import { useMemo } from 'react';
import { RotateCcw } from 'lucide-react';
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
    <div className="w-56 flex-shrink-0 border-r border-border bg-white overflow-y-auto">
      <div className="p-4">

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
    </div>
  );
}
