'use client';

import { useMemo } from 'react';
import { RotateCcw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { capitalize } from '@/lib/utils';
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
  selectedModello: string | null;
  onModelloChange: (v: string | null) => void;
  selectedMateriale: string | null;
  onMaterialeChange: (v: string | null) => void;
  selectedColore: string | null;
  onColoreChange: (v: string | null) => void;
  selectedTemaColore: string | null;
  onTemaColoreChange: (v: string | null) => void;
  selectedStagione: string | null;
  onStagioneChange: (v: string | null) => void;
  selectedCollezione: string | null;
  onCollezioneChange: (v: string | null) => void;
  selectedProduttore: string | null;
  onProduttoreChange: (v: string | null) => void;
  selectedTranche: string | null;
  onTrancheChange: (v: string | null) => void;
  selectedBloccoColore: { id: number; name: string } | null;
  onBloccoColoreChange: (v: { id: number; name: string } | null) => void;
  hasActiveFilters: boolean;
  onResetAll: () => void;
  enabledFilters?: string[] | null;
  lockedCollezione?: string;
  lockedFamiglia?: string;
}

type FilterRecord = Record<string, string | null>;

// Fields that have a secondary value (OR logic)
const MULTI_VALUE_FIELDS: Record<string, string> = {
  classe: 'classe2',
  sottoclasse: 'sottoclasse2',
  gruppoOmogeneo: 'gruppoOmogeneo2',
};

function productMatchesFilter(p: Product, key: string, value: string): boolean {
  if (key === 'temaColore') {
    return [p.temaColore, p.temaColore2, p.temaColore3, p.temaColore4, p.temaColore5].some(v => v === value);
  }
  if (key === 'materiale') {
    return [p.materiale1, p.materiale2, p.materiale3].some(v => v === value);
  }
  if (key === 'colore') {
    return [p.colore, p.colore2, p.colore3].some(v => v === value);
  }
  const primary = (p as unknown as Record<string, unknown>)[key] as string | undefined;
  if (primary === value) return true;
  const secondary = MULTI_VALUE_FIELDS[key];
  if (secondary) {
    const sec = (p as unknown as Record<string, unknown>)[secondary] as string | undefined;
    return sec === value;
  }
  return false;
}

// Apply every active filter EXCEPT excludeKey
function applyFiltersExcept(products: Product[], filters: FilterRecord, excludeKey: string): Product[] {
  return products.filter(p =>
    Object.entries(filters).every(([key, value]) => {
      if (!value || key === excludeKey) return true;
      return productMatchesFilter(p, key, value);
    })
  );
}

// Count distinct values for a field from the "exclude self" filtered product set
function computeOptions(products: Product[], filters: FilterRecord, key: string): { value: string; count: number }[] {
  const filtered = applyFiltersExcept(products, filters, key);

  if (key === 'temaColore') {
    const counts = new Map<string, number>();
    for (const p of filtered) {
      for (const v of [p.temaColore, p.temaColore2, p.temaColore3, p.temaColore4, p.temaColore5]) {
        if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([value, count]) => ({ value, count }));
  }
  if (key === 'materiale') {
    const counts = new Map<string, number>();
    for (const p of filtered) {
      for (const v of [p.materiale1, p.materiale2, p.materiale3]) {
        if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([value, count]) => ({ value, count }));
  }
  if (key === 'colore') {
    const counts = new Map<string, number>();
    for (const p of filtered) {
      for (const v of [p.colore, p.colore2, p.colore3]) {
        if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([value, count]) => ({ value, count }));
  }

  const counts = new Map<string, number>();
  for (const p of filtered) {
    const primary = (p as unknown as Record<string, unknown>)[key] as string | undefined;
    if (primary) counts.set(primary, (counts.get(primary) ?? 0) + 1);
    const secondary = MULTI_VALUE_FIELDS[key];
    if (secondary) {
      const sec = (p as unknown as Record<string, unknown>)[secondary] as string | undefined;
      if (sec && sec !== primary) counts.set(sec, (counts.get(sec) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([value, count]) => ({ value, count }));
}

function FilterSelect({
  label,
  allLabel,
  value,
  options,
  onChange,
  formatLabel,
}: {
  label: string;
  allLabel: string;
  value: string | null;
  options: { value: string; count: number }[];
  onChange: (v: string | null) => void;
  formatLabel?: (v: string) => string;
}) {
  if (options.length === 0 && !value) return null;
  return (
    <div className="mb-3">
      <label className="block text-2xs text-gray-400 uppercase tracking-wider mb-1">{label}</label>
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
        className="w-full text-xs border border-border rounded px-2 py-1.5 text-primary bg-white focus:outline-none focus:border-accent transition-colors cursor-pointer"
      >
        <option value="">{allLabel}</option>
        {options.map(({ value: optValue, count }) => (
          <option key={optValue} value={optValue}>{formatLabel ? formatLabel(optValue) : optValue} ({count})</option>
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
  selectedModello,            onModelloChange,
  selectedMateriale,          onMaterialeChange,
  selectedColore,             onColoreChange,
  selectedTemaColore,         onTemaColoreChange,
  selectedStagione,           onStagioneChange,
  selectedCollezione,         onCollezioneChange,
  selectedProduttore,         onProduttoreChange,
  selectedTranche,            onTrancheChange,
  selectedBloccoColore,       onBloccoColoreChange,
  hasActiveFilters,           onResetAll,
  enabledFilters,
  lockedCollezione,
  lockedFamiglia,
}: CatalogFiltersProps) {
  const t = useTranslations('filters');

  const { data: colorBlocks } = useQuery<{ id: number; name: string }[]>({
    queryKey: ['color-blocks'],
    queryFn: async () => {
      const res = await fetch('/api/color-blocks');
      return (await res.json()).data;
    },
    staleTime: 300_000,
  });
  const show = (key: string) => !enabledFilters || enabledFilters.length === 0 || enabledFilters.includes(key);

  // Flat record of all active selections — used by computeOptions for each filter
  const activeFilters = useMemo<FilterRecord>(() => ({
    gruppoMerceologico: selectedGruppoMerceologico,
    famiglia:           selectedFamiglia,
    classe:             selectedClasse,
    sottoclasse:        selectedSottoclasse,
    gruppoOmogeneo:     selectedGruppoOmogeneo,
    nomLinea:           selectedNomLinea,
    modello:            selectedModello,
    materiale:          selectedMateriale,
    colore:             selectedColore,
    temaColore:         selectedTemaColore,
    stagione:           selectedStagione,
    collezione:         selectedCollezione,
    produttore:         selectedProduttore,
    tranche:            selectedTranche,
  }), [
    selectedGruppoMerceologico, selectedFamiglia, selectedClasse, selectedSottoclasse,
    selectedGruppoOmogeneo, selectedNomLinea, selectedModello, selectedMateriale,
    selectedColore, selectedTemaColore, selectedStagione, selectedCollezione,
    selectedProduttore, selectedTranche,
  ]);

  // Compute available options for ALL filters in one memo — each uses "exclude self" logic
  const opts = useMemo(() => ({
    gruppoMerceologico: computeOptions(products, activeFilters, 'gruppoMerceologico'),
    famiglia:           computeOptions(products, activeFilters, 'famiglia'),
    classe:             computeOptions(products, activeFilters, 'classe'),
    sottoclasse:        computeOptions(products, activeFilters, 'sottoclasse'),
    gruppoOmogeneo:     computeOptions(products, activeFilters, 'gruppoOmogeneo'),
    nomLinea:           computeOptions(products, activeFilters, 'nomLinea'),
    modello:            computeOptions(products, activeFilters, 'modello'),
    materiale:          computeOptions(products, activeFilters, 'materiale'),
    colore:             computeOptions(products, activeFilters, 'colore'),
    temaColore:         computeOptions(products, activeFilters, 'temaColore'),
    stagione:           computeOptions(products, activeFilters, 'stagione'),
    collezione:         computeOptions(products, activeFilters, 'collezione'),
    produttore:         computeOptions(products, activeFilters, 'produttore'),
    tranche:            computeOptions(products, activeFilters, 'tranche'),
  }), [products, activeFilters]);

  return (
    <div className="w-56 flex-shrink-0 border-r border-border bg-white overflow-y-auto h-full">
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

        {show('gruppoMerceologico') && <FilterSelect label={t('gruppoMerceologico')} allLabel={t('all')} value={selectedGruppoMerceologico} options={opts.gruppoMerceologico} onChange={onGruppoMerceologicoChange} />}
        {show('famiglia') && !lockedFamiglia && <FilterSelect label={t('famiglia')} allLabel={t('all')} value={selectedFamiglia} options={opts.famiglia} onChange={onFamigliaChange} />}
        {show('classe')             && <FilterSelect label={t('classe')}             allLabel={t('all')} value={selectedClasse}             options={opts.classe}             onChange={onClasseChange} />}
        {show('sottoclasse')        && <FilterSelect label={t('sottoclasse')}        allLabel={t('all')} value={selectedSottoclasse}        options={opts.sottoclasse}        onChange={onSottoclasseChange} />}
        {show('gruppoOmogeneo')     && <FilterSelect label={t('gruppoOmogeneo')}     allLabel={t('all')} value={selectedGruppoOmogeneo}     options={opts.gruppoOmogeneo}     onChange={onGruppoOmogeneoChange} />}
        {show('nomLinea')           && <FilterSelect label={t('linea')}              allLabel={t('all')} value={selectedNomLinea}           options={opts.nomLinea}           onChange={onNomLineaChange} />}
        {show('modello')            && <FilterSelect label={t('modello')}            allLabel={t('all')} value={selectedModello}            options={opts.modello}            onChange={onModelloChange} />}
        {show('materiale')          && <FilterSelect label={t('materiale')}          allLabel={t('all')} value={selectedMateriale}          options={opts.materiale}          onChange={onMaterialeChange}  formatLabel={capitalize} />}
        {show('colore')             && <FilterSelect label={t('colore')}             allLabel={t('all')} value={selectedColore}             options={opts.colore}             onChange={onColoreChange}     formatLabel={capitalize} />}
        {show('temaColore')         && <FilterSelect label={t('temaColore')}         allLabel={t('all')} value={selectedTemaColore}         options={opts.temaColore}         onChange={onTemaColoreChange} formatLabel={capitalize} />}
        {show('stagione')           && <FilterSelect label={t('stagione')}           allLabel={t('all')} value={selectedStagione}           options={opts.stagione}           onChange={onStagioneChange} />}
        {show('collezione') && !lockedCollezione && <FilterSelect label={t('collezione')} allLabel={t('all')} value={selectedCollezione} options={opts.collezione} onChange={onCollezioneChange} />}
        {show('produttore')         && <FilterSelect label={t('produttore')}         allLabel={t('all')} value={selectedProduttore}         options={opts.produttore}         onChange={onProduttoreChange} />}
        {show('tranche')            && <FilterSelect label={t('tranche')}            allLabel={t('all')} value={selectedTranche}           options={opts.tranche}            onChange={onTrancheChange} />}
        {show('bloccoColore') && colorBlocks && colorBlocks.length > 0 && (
          <FilterSelect
            label={t('bloccoColore')}
            allLabel={t('all')}
            value={selectedBloccoColore?.name ?? null}
            options={colorBlocks.map((cb) => ({
              value: cb.name,
              count: products.filter((p) => (p.colorBlockIds ?? []).includes(cb.id)).length,
            }))}
            onChange={(name) => {
              if (!name) { onBloccoColoreChange(null); return; }
              const cb = colorBlocks.find((c) => c.name === name);
              if (cb) onBloccoColoreChange({ id: cb.id, name: cb.name });
            }}
          />
        )}

      </div>
    </div>
  );
}
