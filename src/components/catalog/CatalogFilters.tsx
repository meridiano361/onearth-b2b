'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Category } from '@/types';

interface CatalogFiltersProps {
  categories: Category[];
  selectedCategoryId: string | null;
  onCategoryChange: (id: string | null) => void;
  priceRange: [number, number];
  onPriceRangeChange: (range: [number, number]) => void;
  maxPrice: number;
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
          'flex items-center gap-2 w-full text-left px-3 py-2 rounded text-xs transition-all duration-100',
          level > 0 && 'pl-7',
          isSelected
            ? 'bg-cream text-primary font-medium'
            : 'text-gray-600 hover:bg-cream/60 hover:text-primary'
        )}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
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
            <CategoryNode
              key={child.id}
              category={child}
              selectedId={selectedId}
              onSelect={onSelect}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function CatalogFilters({
  categories,
  selectedCategoryId,
  onCategoryChange,
  priceRange,
  onPriceRangeChange,
  maxPrice,
}: CatalogFiltersProps) {
  const rootCategories = categories.filter((c) => !c.parentId);

  // Build tree
  const buildTree = (cats: Category[]): Category[] => {
    const map = new Map<string, Category>();
    cats.forEach((c) => map.set(c.id, { ...c, children: [] }));
    const roots: Category[] = [];
    map.forEach((cat) => {
      if (cat.parentId && map.has(cat.parentId)) {
        map.get(cat.parentId)!.children!.push(cat);
      } else if (!cat.parentId) {
        roots.push(cat);
      }
    });
    return roots;
  };

  const tree = buildTree(categories);

  return (
    <div className="w-56 flex-shrink-0 border-r border-border bg-white overflow-y-auto">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <span className="label-luxury">Filtri</span>
          {selectedCategoryId && (
            <button
              onClick={() => onCategoryChange(null)}
              className="text-2xs text-gray-400 hover:text-primary flex items-center gap-1 transition-colors"
            >
              <X size={10} /> Cancella
            </button>
          )}
        </div>

        {/* Category tree */}
        <div className="mb-6">
          <p className="label-luxury mb-2">Categoria</p>
          <button
            onClick={() => onCategoryChange(null)}
            className={cn(
              'flex items-center gap-2 w-full text-left px-3 py-2 rounded text-xs transition-all duration-100 mb-0.5',
              !selectedCategoryId
                ? 'bg-cream text-primary font-medium'
                : 'text-gray-600 hover:bg-cream/60 hover:text-primary'
            )}
          >
            <div className="w-3 h-3 flex-shrink-0" />
            Tutti i Prodotti
          </button>
          {tree.map((cat) => (
            <CategoryNode
              key={cat.id}
              category={cat}
              selectedId={selectedCategoryId}
              onSelect={onCategoryChange}
            />
          ))}
        </div>

        {/* Price range */}
        <div>
          <p className="label-luxury mb-3">Prezzo Costo Max</p>
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
        </div>
      </div>
    </div>
  );
}
