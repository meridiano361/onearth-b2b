'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, Search, Loader2, AlertCircle } from 'lucide-react';

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

  const {
    data: colors = [],
    isLoading,
    isError,
    error,
  } = useQuery<PantoneColor[], Error>({
    queryKey: ['pantone-colors-fhi-tcx'],
    queryFn: async () => {
      console.log('[Pantone] fetch /api/pantone-colors...');
      const res = await fetch('/api/pantone-colors');
      const json = await res.json();
      if (!res.ok) {
        console.error('[Pantone] API error', res.status, json);
        throw new Error(json.error ?? `HTTP ${res.status}`);
      }
      console.log('[Pantone] ricevuti', json.data?.length ?? 0, 'colori');
      return json.data ?? [];
    },
    staleTime: 600_000,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const result = q
      ? colors.filter(
          (c) => c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)
        )
      : colors;
    const sliced = result.slice(0, 60);
    console.log('[Pantone] filtered:', sliced.length, 'risultati, query:', JSON.stringify(q));
    return sliced;
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
    console.log('[Pantone] selezionato:', c.code, c.name, c.hex_code);
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

      {/* Errore fetch */}
      {isError && (
        <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">
          <AlertCircle size={13} className="flex-shrink-0" />
          <span>Errore caricamento colori: {error?.message ?? 'sconosciuto'}</span>
        </div>
      )}

      {/* Input ricerca — mai disabled, l'icona cambia in spinner durante loading */}
      <div className="relative">
        {isLoading ? (
          <Loader2
            size={13}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin pointer-events-none"
          />
        ) : (
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        )}
        <input
          type="text"
          value={search}
          placeholder={
            isLoading
              ? 'Caricamento colori…'
              : isError
              ? 'Errore — ricarica la pagina'
              : 'Cerca per codice o nome…'
          }
          onFocus={() => {
            console.log('[Pantone] focus, colors:', colors.length, 'isLoading:', isLoading);
            setOpen(true);
          }}
          onChange={(e) => {
            setSearch(e.target.value);
            setOpen(true);
          }}
          className="w-full h-9 border border-border rounded pl-8 pr-3 text-sm text-primary placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </div>

      {/* Dropdown */}
      {open && !isLoading && !isError && (
        <div className="absolute z-50 mt-1 w-full max-h-56 overflow-y-auto bg-white border border-border rounded shadow-lg">
          {filtered.length === 0 ? (
            <p className="px-3 py-4 text-xs text-gray-400 text-center">
              {search
                ? `Nessun risultato per "${search}"`
                : 'Nessun colore disponibile'}
            </p>
          ) : (
            filtered.map((c) => (
              <button
                key={c.code}
                type="button"
                // preventDefault impedisce il blur sull'input prima che il click venga registrato
                onMouseDown={(e) => e.preventDefault()}
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
            ))
          )}
        </div>
      )}
    </div>
  );
}
