'use client';

import { useMemo } from 'react';
import { ChevronDown, ChevronRight, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { Category, Product } from '@/types';

interface CatalogFiltersProps {
  categories: Category[];
  products: Product[];
  selectedCategoryId: string | null;
  onCategoryChange: (id: string | null) => void;
  priceRange: [number, number];
  onPriceRangeChange: (range: [number, number]) => void;
  maxPrice: number;
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
  priceRange,
  onPriceRangeChange,
  maxPrice,
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
    <div className="w-56 flex-shrink-0 border-r border-border bg-white overflow-y-auto h-full">
      <div className="p-4">
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

        {/* Price range */}
        <FilterSection title="Prezzo Costo Max">
          <div className="px-1">
            <input
              type="range"
              min={0}
              max={maxPrice}
              step={50}
              value={priceRange[1]}
              onChange={(e) => onPriceRangeChange([priceRange[0], Number(e.target.value)])}
              className="w-full accent-accent h-1 cursor-pointer"
            />
            <div className="flex justify-between mt-1.5">
              <span className="text-2xs text-gray-400">€0</span>
              <span className="text-2xs text-primary font-medium">
                ≤ €{priceRange[1].toLocaleString('it-IT')}
              </span>
            </div>
          </div>
        </FilterSection>
      </div>
    </div>
  );
}
