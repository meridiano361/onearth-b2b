'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { normalizeLookupValue } from '@/lib/normalizeClassification';

interface Option {
  id: string;
  nome: string;
}

interface ManagedSelectProps {
  entita: string;
  label: string;
  value: string;
  onChange: (nome: string) => void;
}

export default function ManagedSelect({ entita, label, value, onChange }: ManagedSelectProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [addingNew, setAddingNew] = useState(false);
  const [newNome, setNewNome] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNome, setEditNome] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const newInputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  const { data } = useQuery({
    queryKey: ['lookup', entita],
    queryFn: () =>
      fetch(`/api/lookup/${entita}`).then((r) => r.json()) as Promise<{ data: Option[] }>,
    staleTime: 0,
  });

  const options = data?.data || [];

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setAddingNew(false);
        setEditingId(null);
        setDeletingId(null);
        setNewNome('');
      }
    }
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    if (addingNew) newInputRef.current?.focus();
  }, [addingNew]);

  useEffect(() => {
    if (editingId) editInputRef.current?.focus();
  }, [editingId]);

  function select(nome: string) {
    onChange(nome);
    setOpen(false);
    setAddingNew(false);
    setEditingId(null);
    setDeletingId(null);
  }

  async function handleAdd() {
    const nome = normalizeLookupValue(entita, newNome);
    if (!nome) return;
    try {
      const res = await fetch(`/api/lookup/${entita}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Errore');
      }
      await queryClient.invalidateQueries({ queryKey: ['lookup', entita] });
      onChange(nome);
      setNewNome('');
      setAddingNew(false);
      setOpen(false);
      toast.success('Aggiunto');
    } catch (err: any) {
      toast.error(err.message || 'Impossibile aggiungere');
    }
  }

  async function handleEdit(id: string, oldNome: string) {
    const nome = normalizeLookupValue(entita, editNome);
    if (!nome) return;
    try {
      const res = await fetch(`/api/lookup/${entita}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Errore');
      }
      await queryClient.invalidateQueries({ queryKey: ['lookup', entita] });
      if (value === oldNome) onChange(nome);
      setEditingId(null);
      toast.success('Modificato');
    } catch (err: any) {
      toast.error(err.message || 'Impossibile modificare');
    }
  }

  async function handleDelete(id: string, nome: string) {
    try {
      const res = await fetch(`/api/lookup/${entita}/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      await queryClient.invalidateQueries({ queryKey: ['lookup', entita] });
      if (value === nome) onChange('');
      setDeletingId(null);
      toast.success('Eliminato');
    } catch {
      toast.error('Impossibile eliminare');
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>

      {/* Trigger */}
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          setAddingNew(false);
          setEditingId(null);
          setDeletingId(null);
        }}
        className="w-full h-9 border border-border rounded px-3 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-accent flex items-center justify-between"
      >
        <span className={value ? 'text-primary' : 'text-gray-400'}>{value || '—'}</span>
        <ChevronDown
          size={13}
          className={`text-gray-400 flex-shrink-0 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-border rounded shadow-lg overflow-hidden">
          {/* Scrollable list */}
          <div className="max-h-52 overflow-y-auto">
            {/* Clear */}
            <button
              type="button"
              onClick={() => select('')}
              className="w-full px-3 py-2 text-left text-sm text-gray-400 hover:bg-cream border-b border-border/50"
            >
              —
            </button>

            {options.length === 0 && (
              <p className="px-3 py-3 text-xs text-gray-400 text-center">Nessun valore. Aggiungi il primo.</p>
            )}

            {options.map((opt) => (
              <div key={opt.id} className="group flex items-center border-b border-border/30 last:border-0">
                {editingId === opt.id ? (
                  <div className="flex items-center gap-1 flex-1 px-2 py-1.5">
                    <input
                      ref={editInputRef}
                      value={editNome}
                      onChange={(e) => setEditNome(e.target.value)}
                      onKeyDown={(e) => {
                        e.stopPropagation();
                        if (e.key === 'Enter') handleEdit(opt.id, opt.nome);
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 text-sm border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent min-w-0"
                    />
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleEdit(opt.id, opt.nome); }}
                      className="p-1 text-green-600 hover:text-green-700 flex-shrink-0"
                    >
                      <Check size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setEditingId(null); }}
                      className="p-1 text-gray-400 hover:text-gray-600 flex-shrink-0"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ) : deletingId === opt.id ? (
                  <div className="flex items-center gap-2 flex-1 px-3 py-2">
                    <span className="text-xs text-red-600 flex-1 truncate">Eliminare &ldquo;{opt.nome}&rdquo;?</span>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleDelete(opt.id, opt.nome); }}
                      className="text-2xs font-medium text-red-600 hover:text-red-700 flex-shrink-0"
                    >
                      Sì
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setDeletingId(null); }}
                      className="text-2xs text-gray-400 hover:text-gray-600 flex-shrink-0"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => select(opt.nome)}
                      className="flex-1 px-3 py-2 text-left text-sm text-primary hover:bg-cream min-w-0 flex items-center gap-1.5"
                    >
                      <span className="truncate">{opt.nome}</span>
                      {value === opt.nome && (
                        <Check size={11} className="text-accent flex-shrink-0" />
                      )}
                    </button>
                    <div className="flex items-center gap-0.5 pr-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingId(opt.id);
                          setEditNome(opt.nome);
                          setDeletingId(null);
                          setAddingNew(false);
                        }}
                        className="p-1 text-gray-400 hover:text-primary rounded hover:bg-gray-100"
                        title="Modifica"
                      >
                        <Pencil size={11} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingId(opt.id);
                          setEditingId(null);
                          setAddingNew(false);
                        }}
                        className="p-1 text-gray-400 hover:text-red-500 rounded hover:bg-red-50"
                        title="Elimina"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Add new — always visible at bottom */}
          <div className="border-t border-border">
            {addingNew ? (
              <div className="flex items-center gap-1 px-2 py-2">
                <input
                  ref={newInputRef}
                  value={newNome}
                  onChange={(e) => setNewNome(e.target.value)}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === 'Enter') handleAdd();
                    if (e.key === 'Escape') { setAddingNew(false); setNewNome(''); }
                  }}
                  onClick={(e) => e.stopPropagation()}
                  placeholder="Nuovo valore..."
                  className="flex-1 text-sm border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent min-w-0"
                />
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleAdd(); }}
                  className="p-1 text-green-600 hover:text-green-700 flex-shrink-0"
                >
                  <Check size={13} />
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setAddingNew(false); setNewNome(''); }}
                  className="p-1 text-gray-400 hover:text-gray-600 flex-shrink-0"
                >
                  <X size={13} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setAddingNew(true);
                  setEditingId(null);
                  setDeletingId(null);
                }}
                className="w-full flex items-center gap-1.5 px-3 py-2 text-xs text-accent hover:bg-cream"
              >
                <Plus size={11} />
                Aggiungi nuovo...
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
