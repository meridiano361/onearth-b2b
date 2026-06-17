'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Search, Loader2, AlertCircle, Plus } from 'lucide-react';
import toast from 'react-hot-toast';

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

const FIELD =
  'w-full h-8 border border-border rounded px-2 text-xs text-primary focus:outline-none focus:ring-1 focus:ring-accent placeholder-gray-400';

export default function ProductPantoneForm({ value, onChange }: Props) {
  const queryClient = useQueryClient();

  // ── Search state ────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Create state ────────────────────────────────────────────────────────────
  const [createMode, setCreateMode] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newHex, setNewHex] = useState('#808080');
  const [isCreating, setIsCreating] = useState(false);

  // ── Query ───────────────────────────────────────────────────────────────────
  const { data: colors = [], isLoading, isError, error } = useQuery<PantoneColor[], Error>({
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

  // ── Filter ──────────────────────────────────────────────────────────────────
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

  const noResults = !isLoading && !isError && open && filtered.length === 0;

  // ── Outside click ───────────────────────────────────────────────────────────
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setCreateMode(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  function handleSelect(c: PantoneColor) {
    console.log('[Pantone] selezionato:', c.code, c.name, c.hex_code);
    onChange({ code: c.code, name: c.name, hex: c.hex_code, systemType: c.system_type });
    setSearch('');
    setOpen(false);
    setCreateMode(false);
  }

  function openCreateMode() {
    setNewCode(search.trim());
    setNewName('');
    setNewHex('#808080');
    setCreateMode(true);
  }

  async function handleCreate() {
    if (!newCode.trim() || !newName.trim()) return;
    setIsCreating(true);
    try {
      const res = await fetch('/api/pantone-colors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: newCode.trim(),
          name: newName.trim(),
          hex_code: newHex,
          system_type: 'FHI-TCX',
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Errore creazione Pantone');

      const created: PantoneColor = {
        code: json.data.code,
        name: json.data.name,
        hex_code: json.data.hex_code,
        system_type: json.data.system_type,
      };

      // Aggiorna cache TanStack Query
      queryClient.setQueryData<PantoneColor[]>(['pantone-colors-fhi-tcx'], (old = []) =>
        [...old, created].sort((a, b) => a.code.localeCompare(b.code))
      );

      toast.success(`Pantone ${created.code} creato`);
      handleSelect(created);
    } catch (err: any) {
      toast.error(err.message ?? 'Errore nella creazione del Pantone');
    } finally {
      setIsCreating(false);
    }
  }

  // ── JSX ──────────────────────────────────────────────────────────────────────
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

      {/* Input ricerca */}
      <div className="relative">
        {isLoading ? (
          <Loader2
            size={13}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin pointer-events-none"
          />
        ) : (
          <Search
            size={13}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
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
            setCreateMode(false);
          }}
          className="w-full h-9 border border-border rounded pl-8 pr-3 text-sm text-primary placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </div>

      {/* Dropdown */}
      {open && !isLoading && !isError && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-border rounded shadow-lg">

          {/* Risultati */}
          {!createMode && filtered.length > 0 && (
            <div className="max-h-52 overflow-y-auto">
              {filtered.map((c) => (
                <button
                  key={c.code}
                  type="button"
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
              ))}
            </div>
          )}

          {/* Nessun risultato + pulsante crea */}
          {!createMode && noResults && (
            <div className="px-3 py-3 text-center">
              <p className="text-xs text-gray-400 mb-2">
                {search ? `Nessun risultato per "${search}"` : 'Nessun colore disponibile'}
              </p>
              {search && (
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={openCreateMode}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:text-accent/80 transition-colors"
                >
                  <Plus size={12} />
                  Crea nuovo Pantone "{search}"
                </button>
              )}
            </div>
          )}

          {/* Form di creazione */}
          {createMode && (
            <div className="p-3 space-y-2.5">
              <p className="text-xs font-semibold text-primary">Nuovo Pantone FHI-TCX</p>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-2xs text-gray-500 mb-0.5">Codice *</label>
                  <input
                    type="text"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    placeholder="es. 18-1550 TCX"
                    className={FIELD}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-2xs text-gray-500 mb-0.5">Nome *</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="es. Living Coral"
                    className={FIELD}
                  />
                </div>
              </div>

              <div>
                <label className="block text-2xs text-gray-500 mb-0.5">Colore (hex)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={newHex}
                    onChange={(e) => setNewHex(e.target.value)}
                    className="w-8 h-8 rounded border border-border cursor-pointer p-0.5 bg-white"
                  />
                  <span className="text-xs font-mono text-gray-600 select-all">{newHex}</span>
                  <span className="text-2xs text-gray-400 ml-auto">sistema: FHI-TCX</span>
                </div>
              </div>

              <div className="flex gap-2 pt-0.5">
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setCreateMode(false)}
                  className="flex-1 h-7 border border-border rounded text-xs text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  Annulla
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={handleCreate}
                  disabled={!newCode.trim() || !newName.trim() || isCreating}
                  className="flex-1 h-7 bg-accent text-white rounded text-xs font-medium hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreating ? 'Salvataggio…' : 'Crea e seleziona'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
