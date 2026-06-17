'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, Search } from 'lucide-react';

interface PantoneColor {
  code: string;
  name: string;
  hex_code: string;
  system_type: string;
}

export interface PantoneValue {
  code: string;
  name: string;
  hex: string;
  systemType: string;
}

interface Props {
  value: PantoneValue | null;
  onChange: (v: PantoneValue | null) => void;
}

export default function ProductPantoneForm({ value, onChange }: Props) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: colors = [], isLoading } = useQuery<PantoneColor[]>({
    queryKey: ['pantone-colors-fhi-tcx'],
    queryFn: async () => {
      const res = await fetch('/api/pantone-colors');
      const json = await res.json();
      return json.data ?? [];
    },
    staleTime: 600_000,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return colors.slice(0, 60);
    return colors
      .filter((c) => c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q))
      .slice(0, 60);
  }, [colors, search]);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  function handleSelect(c: PantoneColor) {
    onChange({ code: c.code, name: c.name, hex: c.hex_code, systemType: c.system_type });
    setSearch('');
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Colore selezionato */}
      {value && (
        <div className="flex items-center gap-2.5 mb-2 px-2.5 py-2 bg-gray-50 rounded border border-border">
          <div
            className="w-8 h-8 rounded flex-shrink-0 border border-border/60"
            style={{ backgroundColor: value.hex }}
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-primary leading-tight">{value.code}</p>
            <p className="text-xs text-gray-500 truncate leading-tight">{value.name}</p>
          </div>
          <span className="text-2xs text-gray-400 font-mono">{value.hex}</span>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0"
            aria-label="Rimuovi pantone"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Input ricerca */}
      <div className="relative">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={search}
          placeholder={isLoading ? 'Caricamento colori…' : 'Cerca per codice o nome…'}
          disabled={isLoading}
          onFocus={() => setOpen(true)}
          onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
          className="w-full h-9 border border-border rounded pl-8 pr-3 text-sm text-primary placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-50"
        />
      </div>

      {/* Dropdown risultati */}
      {open && filtered.length > 0 && (
        <div className="absolute z-50 mt-1 w-full max-h-56 overflow-y-auto bg-white border border-border rounded shadow-lg">
          {filtered.map((c) => (
            <button
              key={c.code}
              type="button"
              onClick={() => handleSelect(c)}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-cream text-left transition-colors"
            >
              <div
                className="w-5 h-5 rounded flex-shrink-0 border border-border/60"
                style={{ backgroundColor: c.hex_code }}
              />
              <span className="text-xs font-medium text-primary">{c.code}</span>
              <span className="text-xs text-gray-500 truncate">{c.name}</span>
              <span className="text-2xs text-gray-400 font-mono ml-auto flex-shrink-0">{c.hex_code}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
