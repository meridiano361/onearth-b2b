'use client';

import { useMemo } from 'react';
import { ChevronDown, ChevronRight, RotateCcw, Globe } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { Category, Product } from '@/types';

interface CatalogFiltersProps {
  categories: Category[];
  products: Product[];
  selectedCategoryId: string | null;
  onCategoryChange: (id: string | null) => void;
  selectedFamiglia: string | null;
  onFamigliaChange: (v: string | null) => void;
  selectedSottofamiglia: string | null;
  onSottofamigliaChange: (v: string | null) => void;
  selectedColore: string | null;
  onColoreChange: (v: string | null) => void;
  selectedNomLinea: string | null;
  onNomLineaChange: (v: string | null) => void;
  hasActiveFilters: boolean;
  onResetAll: () => void;
}

interface CategoryNodeProps {
  category: Category;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  level?: number;
}

function CategoryNode({ category, selectedId, onSelect, level = 0 }: CategoryNodeProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = category.children && category.children.length > 0;
  const isSelected = selectedId === category.id;

  return (
    <div>
      <button
        onClick={() => {
          onSelect(isSelected ? null : category.id);
          if (hasChildren) setIsExpanded(true);
        }}
        className={cn(
          'flex items-center gap-2 w-full text-left px-3 py-1.5 rounded text-xs transition-all duration-100',
          level > 0 && 'pl-7',
          isSelected
            ? 'bg-cream text-primary font-medium'
            : 'text-gray-600 hover:bg-cream/60 hover:text-primary'
        )}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
            className="text-gray-400 hover:text-gray-600 -ml-1 flex-shrink-0"
          >
            {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </button>
        ) : (
          <div className="w-3 h-3 flex-shrink-0" />
        )}
        <span className="truncate">{category.name}</span>
      </button>

      {hasChildren && isExpanded && (
        <div>
          {category.children!.map((child) => (
            <CategoryNode key={child.id} category={child} selectedId={selectedId} onSelect={onSelect} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterSection({ title, children, count }: { title: string; children: React.ReactNode; count?: number }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="mb-4">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full mb-2 group"
      >
        <span className="label-luxury text-gray-500 group-hover:text-primary transition-colors">{title}</span>
        <div className="flex items-center gap-1.5">
          {count != null && count > 0 && (
            <span className="text-2xs bg-accent/20 text-accent font-semibold px-1.5 py-0.5 rounded-full">{count}</span>
          )}
          <ChevronDown size={12} className={cn('text-gray-400 transition-transform', open ? '' : '-rotate-90')} />
        </div>
      </button>
      {open && children}
    </div>
  );
}

function FilterPill({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center w-full text-left px-3 py-1.5 rounded text-xs transition-all duration-100',
        selected
          ? 'bg-cream text-primary font-medium'
          : 'text-gray-600 hover:bg-cream/60 hover:text-primary'
      )}
    >
      <span className="truncate">{label}</span>
    </button>
  );
}

export default function CatalogFilters({
  categories,
  products,
  selectedCategoryId,
  onCategoryChange,
  selectedFamiglia,
  onFamigliaChange,
  selectedSottofamiglia,
  onSottofamigliaChange,
  selectedColore,
  onColoreChange,
  selectedNomLinea,
  onNomLineaChange,
  hasActiveFilters,
  onResetAll,
}: CatalogFiltersProps) {
  // Build category tree
  const tree = useMemo(() => {
    const map = new Map<string, Category>();
    categories.forEach((c) => map.set(c.id, { ...c, children: [] }));
    const roots: Category[] = [];
    map.forEach((cat) => {
      if (cat.parentId && map.has(cat.parentId)) {
        map.get(cat.parentId)!.children!.push(cat);
      } else if (!cat.parentId) {
        roots.push(cat);
      }
    });
    return roots;
  }, [categories]);

  // Derive unique filter options from all products (not filtered)
  const famiglieOptions = useMemo(
    () => [...new Set(products.map((p) => p.famiglia).filter(Boolean) as string[])].sort(),
    [products]
  );

  // Sottofamiglie: filtered by selected famiglia if set
  const sottofamiglieOptions = useMemo(() => {
    const source = selectedFamiglia
      ? products.filter((p) => p.famiglia === selectedFamiglia)
      : products;
    return [...new Set(source.map((p) => p.sottofamiglia).filter(Boolean) as string[])].sort();
  }, [products, selectedFamiglia]);

  const coloriOptions = useMemo(
    () => [...new Set(products.map((p) => p.colore).filter(Boolean) as string[])].sort(),
    [products]
  );

  const nomLineaOptions = useMemo(
    () => [...new Set(products.map((p) => p.nomLinea).filter(Boolean) as string[])].sort(),
    [products]
  );

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

        {/* Category */}
        <FilterSection title="Categoria">
          <button
            onClick={() => onCategoryChange(null)}
            className={cn(
              'flex items-center gap-2 w-full text-left px-3 py-1.5 rounded text-xs transition-all duration-100 mb-0.5',
              !selectedCategoryId ? 'bg-cream text-primary font-medium' : 'text-gray-600 hover:bg-cream/60 hover:text-primary'
            )}
          >
            <div className="w-3 h-3 flex-shrink-0" />
            Tutti i Prodotti
          </button>
          {tree.map((cat) => (
            <CategoryNode key={cat.id} category={cat} selectedId={selectedCategoryId} onSelect={onCategoryChange} />
          ))}
        </FilterSection>

        {/* Famiglia */}
        {famiglieOptions.length > 0 && (
          <FilterSection title="Famiglia" count={selectedFamiglia ? 1 : 0}>
            {famiglieOptions.map((f) => (
              <FilterPill
                key={f}
                label={f}
                selected={selectedFamiglia === f}
                onClick={() => {
                  if (selectedFamiglia === f) {
                    onFamigliaChange(null);
                  } else {
                    onFamigliaChange(f);
                    onSottofamigliaChange(null); // reset sottofamiglia when famiglia changes
                  }
                }}
              />
            ))}
          </FilterSection>
        )}

        {/* Sottofamiglia — only shown when famiglia is selected or has values */}
        {sottofamiglieOptions.length > 0 && (
          <FilterSection title="Sottofamiglia" count={selectedSottofamiglia ? 1 : 0}>
            {sottofamiglieOptions.map((s) => (
              <FilterPill
                key={s}
                label={s}
                selected={selectedSottofamiglia === s}
                onClick={() => onSottofamigliaChange(selectedSottofamiglia === s ? null : s)}
              />
            ))}
          </FilterSection>
        )}

        {/* Nome Linea */}
        {nomLineaOptions.length > 0 && (
          <FilterSection title="Linea" count={selectedNomLinea ? 1 : 0}>
            {nomLineaOptions.map((l) => (
              <FilterPill
                key={l}
                label={l}
                selected={selectedNomLinea === l}
                onClick={() => onNomLineaChange(selectedNomLinea === l ? null : l)}
              />
            ))}
          </FilterSection>
        )}

        {/* Colore */}
        {coloriOptions.length > 0 && (
          <FilterSection title="Colore" count={selectedColore ? 1 : 0}>
            {coloriOptions.map((c) => (
              <FilterPill
                key={c}
                label={c}
                selected={selectedColore === c}
                onClick={() => onColoreChange(selectedColore === c ? null : c)}
              />
            ))}
          </FilterSection>
        )}

      </div>

      {/* ── Footer links ─────────────────────────────────── */}
      <div className="flex-shrink-0 border-t border-border/60 px-3 py-3 space-y-2">
        {/* Spotify widget */}
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
            Ascolta <span className="font-semibold">MATERIA</span> il nuovo podcast di On Earth: storie di design, progetti e relazioni. Spunti per abitare il mondo con cura.
          </p>
        </a>

        {/* ON EARTH link */}
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
