'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import toast from 'react-hot-toast';

const TIPI = [
  { tipo: 'gruppoMerceologico', label: 'Gruppo merceologico' },
  { tipo: 'famiglia', label: 'Famiglia' },
  { tipo: 'classe', label: 'Classe' },
  { tipo: 'sottoclasse', label: 'Sottoclasse' },
  { tipo: 'gruppoOmogeneo', label: 'Gruppo omogeneo' },
  { tipo: 'nomLinea', label: 'Linea' },
  { tipo: 'stagione', label: 'Stagione' },
  { tipo: 'collezione', label: 'Collezione' },
  { tipo: 'colore', label: 'Colore' },
  { tipo: 'temaColore', label: 'Tema colore' },
];

interface ValoreItem {
  id: string;
  nome: string;
  createdAt: string;
}

function ClassificazioneTab({ tipo, label }: { tipo: string; label: string }) {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [newNome, setNewNome] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNome, setEditNome] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['classificazione', tipo],
    queryFn: async () => {
      const res = await fetch(`/api/classificazione/${tipo}`);
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  const items: ValoreItem[] = data?.data || [];

  async function handleAdd() {
    if (!newNome.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/classificazione/${tipo}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: newNome.trim() }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed');
      }
      setNewNome('');
      setIsAdding(false);
      await queryClient.invalidateQueries({ queryKey: ['classificazione', tipo] });
      await queryClient.invalidateQueries({ queryKey: ['classificazione-all'] });
      toast.success('Valore aggiunto');
    } catch (err: any) {
      toast.error(err.message || 'Impossibile aggiungere');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleEdit(id: string) {
    if (!editNome.trim()) return;
    try {
      const res = await fetch(`/api/classificazione/${tipo}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: editNome.trim() }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed');
      }
      setEditingId(null);
      await queryClient.invalidateQueries({ queryKey: ['classificazione', tipo] });
      await queryClient.invalidateQueries({ queryKey: ['classificazione-all'] });
      toast.success('Valore aggiornato');
    } catch (err: any) {
      toast.error(err.message || 'Impossibile aggiornare');
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/classificazione/${tipo}/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
      setDeletingId(null);
      await queryClient.invalidateQueries({ queryKey: ['classificazione', tipo] });
      await queryClient.invalidateQueries({ queryKey: ['classificazione-all'] });
      toast.success('Valore eliminato');
    } catch {
      toast.error('Impossibile eliminare');
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-gray-400">{items.length} valor{items.length === 1 ? 'e' : 'i'}</p>
        {!isAdding && (
          <Button size="sm" icon={<Plus size={12} />} onClick={() => { setIsAdding(true); setNewNome(''); }}>
            Aggiungi
          </Button>
        )}
      </div>

      {isAdding && (
        <div className="flex items-center gap-2 mb-3 p-3 bg-cream rounded border border-border">
          <input
            autoFocus
            value={newNome}
            onChange={(e) => setNewNome(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') { setIsAdding(false); setNewNome(''); } }}
            placeholder={`Nuovo valore...`}
            className="flex-1 text-sm border border-border rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent bg-white"
          />
          <button
            onClick={handleAdd}
            disabled={isSubmitting}
            className="p-1.5 text-green-600 hover:text-green-700 disabled:opacity-50"
          >
            <Check size={15} />
          </button>
          <button
            onClick={() => { setIsAdding(false); setNewNome(''); }}
            className="p-1.5 text-gray-400 hover:text-gray-600"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="py-12 text-center"><LoadingSpinner className="mx-auto" /></div>
      ) : items.length === 0 ? (
        <p className="text-center text-gray-400 text-sm py-12">
          Nessun valore. Clicca "Aggiungi" per iniziare.
        </p>
      ) : (
        <div className="bg-white border border-border rounded overflow-hidden">
          <table className="table-luxury w-full">
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="py-3 px-4">
                    {editingId === item.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          autoFocus
                          value={editNome}
                          onChange={(e) => setEditNome(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleEdit(item.id);
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          className="flex-1 text-sm border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent"
                        />
                        <button onClick={() => handleEdit(item.id)} className="p-1 text-green-600 hover:text-green-700">
                          <Check size={13} />
                        </button>
                        <button onClick={() => setEditingId(null)} className="p-1 text-gray-400 hover:text-gray-600">
                          <X size={13} />
                        </button>
                      </div>
                    ) : (
                      <span className="text-sm text-primary">{item.nome}</span>
                    )}
                  </td>
                  <td className="py-3 px-4 w-36">
                    {deletingId === item.id ? (
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="text-2xs text-red-600 hover:text-red-700 font-medium"
                        >
                          Conferma
                        </button>
                        <button
                          onClick={() => setDeletingId(null)}
                          className="text-2xs text-gray-400 hover:text-gray-600"
                        >
                          Annulla
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => { setEditingId(item.id); setEditNome(item.nome); }}
                          className="p-1.5 text-gray-400 hover:text-primary rounded hover:bg-cream transition-colors"
                          title="Modifica"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          onClick={() => setDeletingId(item.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 rounded hover:bg-red-50 transition-colors"
                          title="Elimina"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function AdminClassificazionePage() {
  const [activeTab, setActiveTab] = useState(TIPI[0].tipo);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <p className="label-luxury text-accent mb-1">Admin</p>
        <h1 className="font-display text-2xl text-primary font-light">Classificazione</h1>
        <p className="text-sm text-gray-400 mt-0.5">Gestione valori di classificazione prodotti</p>
      </div>

      {/* Tab bar */}
      <div className="flex flex-wrap gap-1 mb-6 border-b border-border pb-0">
        {TIPI.map(({ tipo, label }) => (
          <button
            key={tipo}
            onClick={() => setActiveTab(tipo)}
            className={cn(
              'px-3 py-2 text-xs font-medium transition-colors border-b-2 -mb-px',
              activeTab === tipo
                ? 'border-accent text-accent'
                : 'border-transparent text-gray-500 hover:text-primary hover:border-gray-300'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {TIPI.map(({ tipo, label }) =>
        activeTab === tipo ? (
          <ClassificazioneTab key={tipo} tipo={tipo} label={label} />
        ) : null
      )}
    </div>
  );
}
