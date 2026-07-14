'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Star, Search, Loader2, AlertCircle, Plus, Check, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import type { ProductPantoneEntry } from '@/types';

interface PantoneColor {
  id: number;
  code: string;
  name: string;
  hex_code: string;
  system_type: string;
}

interface Props {
  value: ProductPantoneEntry[];
  onChange: (v: ProductPantoneEntry[]) => void;
}

const FIELD =
  'w-full h-8 border border-border rounded px-2 text-xs text-primary focus:outline-none focus:ring-1 focus:ring-accent placeholder-gray-400';

export default function ProductPantoneForm({ value, onChange }: Props) {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Lookup state: null = idle, 'loading' = fetching, 'found' | 'notfound' = result
  type LookupState = null | 'loading' | 'found' | 'notfound';
  const [lookupState, setLookupState] = useState<LookupState>(null);
  const [lookupResult, setLookupResult] = useState<PantoneColor | null>(null);

  const [createMode, setCreateMode] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newHex, setNewHex] = useState('#808080');
  const [isCreating, setIsCreating] = useState(false);

  const { data: colors = [], isLoading, isError, error } = useQuery<PantoneColor[], Error>({
    queryKey: ['pantone-colors-fhi-tcx'],
    queryFn: async () => {
      const res = await fetch('/api/pantone-colors');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      return json.data ?? [];
    },
    staleTime: 600_000,
  });

  const selectedIds = useMemo(() => new Set(value.map((p) => p.pantoneColorId)), [value]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const result = q
      ? colors.filter((c) => c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q))
      : colors;
    return result.slice(0, 60);
  }, [colors, search]);

  const noResults = !isLoading && !isError && open && filtered.length === 0;

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setCreateMode(false);
        setLookupState(null);
        setLookupResult(null);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  function addPantone(c: PantoneColor) {
    if (selectedIds.has(c.id)) return;
    const entry: ProductPantoneEntry = {
      pantoneColorId: c.id,
      code: c.code,
      name: c.name,
      hex_code: c.hex_code,
      system_type: c.system_type,
      sortOrder: value.length,
      isPrimary: value.length === 0,
      isAutoFilled: false,
    };
    onChange([...value, entry]);
    setSearch('');
  }

  function removePantone(id: number) {
    const wasPrimary = value.find((p) => p.pantoneColorId === id)?.isPrimary ?? false;
    const next = value.filter((p) => p.pantoneColorId !== id);
    if (wasPrimary && next.length > 0) next[0] = { ...next[0], isPrimary: true };
    onChange(next.map((p, i) => ({ ...p, sortOrder: i })));
  }

  function makePrimary(id: number) {
    onChange(value.map((p) => ({ ...p, isPrimary: p.pantoneColorId === id })));
  }

  function openCreateMode() {
    setNewCode(search.trim());
    setNewName('');
    setNewHex('#808080');
    setCreateMode(true);
  }

  async function handleLookup() {
    const code = search.trim();
    if (!code) return;
    setLookupState('loading');
    setLookupResult(null);
    try {
      const res = await fetch(`/api/pantone-lookup?code=${encodeURIComponent(code)}`);
      const json = await res.json();
      if (json.found && json.color) {
        setLookupState('found');
        setLookupResult(json.color);
      } else {
        setLookupState('notfound');
      }
    } catch {
      setLookupState('notfound');
    }
  }

  async function handleCreate() {
    if (!newCode.trim() || !newName.trim()) return;
    setIsCreating(true);
    try {
      const res = await fetch('/api/pantone-colors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: newCode.trim(), name: newName.trim(), hex_code: newHex, system_type: 'FHI-TCX' }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Errore creazione Pantone');

      const created: PantoneColor = {
        id: json.data.id,
        code: json.data.code,
        name: json.data.name,
        hex_code: json.data.hex_code,
        system_type: json.data.system_type,
      };

      queryClient.setQueryData<PantoneColor[]>(['pantone-colors-fhi-tcx'], (old = []) =>
        [...old, created].sort((a, b) => a.code.localeCompare(b.code))
      );

      toast.success(`Pantone ${created.code} creato`);
      addPantone(created);
      setCreateMode(false);
      setOpen(false);
    } catch (err: any) {
      toast.error(err.message ?? 'Errore nella creazione del Pantone');
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div ref={containerRef} className="relative space-y-2">
      {/* Chips dei selezionati */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((p) => (
            <div
              key={p.pantoneColorId}
              className="flex items-center gap-1.5 bg-gray-50 border border-border rounded-full px-2.5 py-1 text-xs"
            >
              <div
                className="w-3.5 h-3.5 rounded-full flex-shrink-0 border border-border/60"
                style={{ backgroundColor: p.hex_code }}
              />
              <span className="font-medium text-primary">{p.code}</span>
              <span className="text-gray-500 truncate max-w-[80px]">{p.name}</span>
              {p.isPrimary ? (
                <Star size={11} className="text-amber-400 fill-amber-400 flex-shrink-0" aria-label="Principale" />
              ) : (
                <button
                  type="button"
                  onClick={() => makePrimary(p.pantoneColorId)}
                  title="Rendi principale"
                  className="text-gray-300 hover:text-amber-400 transition-colors flex-shrink-0"
                >
                  <Star size={11} />
                </button>
              )}
              <button
                type="button"
                onClick={() => removePantone(p.pantoneColorId)}
                className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0"
                aria-label="Rimuovi"
              >
                <X size={11} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Errore fetch */}
      {isError && (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">
          <AlertCircle size={13} className="flex-shrink-0" />
          <span>Errore caricamento colori: {error?.message ?? 'sconosciuto'}</span>
        </div>
      )}

      {/* Input ricerca */}
      <div className="relative">
        {isLoading ? (
          <Loader2 size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin pointer-events-none" />
        ) : (
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        )}
        <input
          type="text"
          value={search}
          placeholder={
            isLoading ? 'Caricamento colori…' :
            isError ? 'Errore — ricarica la pagina' :
            'Aggiungi colore Pantone…'
          }
          onFocus={() => setOpen(true)}
          onChange={(e) => { setSearch(e.target.value); setOpen(true); setCreateMode(false); setLookupState(null); setLookupResult(null); }}
          className="w-full h-9 border border-border rounded pl-8 pr-3 text-sm text-primary placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </div>

      {/* Dropdown */}
      {open && !isLoading && !isError && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-border rounded shadow-lg">
          {!createMode && filtered.length > 0 && (
            <div className="max-h-52 overflow-y-auto">
              {filtered.map((c) => {
                const isSelected = selectedIds.has(c.id);
                return (
                  <button
                    key={c.code}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => isSelected ? removePantone(c.id) : addPantone(c)}
                    className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-left transition-colors ${isSelected ? 'bg-cream' : 'hover:bg-cream'}`}
                  >
                    <div className="w-5 h-5 rounded flex-shrink-0 border border-border/60" style={{ backgroundColor: c.hex_code }} />
                    <span className="text-xs font-medium text-primary">{c.code}</span>
                    <span className="text-xs text-gray-500 truncate">{c.name}</span>
                    <span className="text-2xs text-gray-400 font-mono ml-auto flex-shrink-0">{c.hex_code}</span>
                    {isSelected && <Check size={12} className="text-accent flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}

          {!createMode && noResults && (
            <div className="px-3 py-3 space-y-2.5">
              <p className="text-xs text-gray-400 text-center">
                {search ? `"${search}" non trovato nel catalogo locale` : 'Nessun colore disponibile'}
              </p>
              {search && lookupState === null && (
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={handleLookup}
                  className="w-full flex items-center justify-center gap-1.5 text-xs font-medium bg-cream border border-border rounded py-1.5 text-primary hover:bg-cream/80 transition-colors"
                >
                  <Search size={11} />
                  Verifica nel catalogo Pantone FHI-TCX
                </button>
              )}
              {search && lookupState === 'loading' && (
                <div className="flex items-center justify-center gap-2 py-1">
                  <Loader2 size={12} className="animate-spin text-accent" />
                  <span className="text-xs text-gray-400">Ricerca in corso…</span>
                </div>
              )}
              {lookupState === 'found' && lookupResult && (
                <div className="space-y-1.5">
                  <p className="text-2xs text-emerald-600 font-medium text-center">✓ Trovato nel catalogo FHI-TCX</p>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => { addPantone(lookupResult); setLookupState(null); setLookupResult(null); setOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded text-left hover:bg-emerald-100 transition-colors"
                  >
                    <div className="w-5 h-5 rounded flex-shrink-0 border border-border/60" style={{ backgroundColor: lookupResult.hex_code }} />
                    <span className="text-xs font-medium text-primary">{lookupResult.code}</span>
                    <span className="text-xs text-gray-500 truncate">{lookupResult.name}</span>
                    <span className="text-2xs text-gray-400 font-mono ml-auto">{lookupResult.hex_code}</span>
                    <Plus size={12} className="text-emerald-600 flex-shrink-0" />
                  </button>
                </div>
              )}
              {lookupState === 'notfound' && (
                <div className="space-y-2">
                  <p className="text-xs text-red-500 text-center">Codice non trovato nel catalogo Pantone FHI-TCX.</p>
                  <a
                    href={`https://www.pantone.com/color-finder/${encodeURIComponent(search.replace(/\s+/g, '-'))}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onMouseDown={(e) => e.preventDefault()}
                    className="w-full flex items-center justify-center gap-1.5 text-xs text-accent hover:text-accent/80 border border-border rounded py-1.5 transition-colors"
                  >
                    <ExternalLink size={11} />
                    Cerca su pantone.com
                  </a>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={openCreateMode}
                    className="w-full text-xs text-gray-400 hover:text-gray-600 py-1 transition-colors"
                  >
                    Aggiungi manualmente (codice non ancora in catalogo)
                  </button>
                </div>
              )}
            </div>
          )}

          {createMode && (
            <div className="p-3 space-y-2.5">
              <p className="text-xs font-semibold text-primary">Nuovo Pantone FHI-TCX</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-2xs text-gray-500 mb-0.5">Codice *</label>
                  <input type="text" value={newCode} onChange={(e) => setNewCode(e.target.value)} placeholder="es. 18-1550 TCX" className={FIELD} autoFocus />
                </div>
                <div>
                  <label className="block text-2xs text-gray-500 mb-0.5">Nome *</label>
                  <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="es. Living Coral" className={FIELD} />
                </div>
              </div>
              <div>
                <label className="block text-2xs text-gray-500 mb-0.5">Colore (hex)</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={newHex} onChange={(e) => setNewHex(e.target.value)} className="w-8 h-8 rounded border border-border cursor-pointer p-0.5 bg-white" />
                  <span className="text-xs font-mono text-gray-600 select-all">{newHex}</span>
                  <span className="text-2xs text-gray-400 ml-auto">sistema: FHI-TCX</span>
                </div>
              </div>
              <div className="flex gap-2 pt-0.5">
                <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => setCreateMode(false)} className="flex-1 h-7 border border-border rounded text-xs text-gray-500 hover:bg-gray-50 transition-colors">
                  Annulla
                </button>
                <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={handleCreate} disabled={!newCode.trim() || !newName.trim() || isCreating} className="flex-1 h-7 bg-accent text-white rounded text-xs font-medium hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  {isCreating ? 'Salvataggio…' : 'Crea e aggiungi'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
