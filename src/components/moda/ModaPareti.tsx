'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, X, Loader2, Layout } from 'lucide-react';
import toast from 'react-hot-toast';
import type { PareteAttrezzata } from '@/types';

function CreatePareteModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [nome, setNome] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/moda/pareti', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome }),
      });
      if (!res.ok) throw new Error('Errore durante la creazione');
      toast.success('Layout creato');
      onCreated();
      onClose();
    } catch {
      toast.error('Errore durante la creazione');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white border border-gray-200 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold text-gray-900">Nuovo layout Visual</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Nome *</label>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="es. Ingresso, Zona Centrale, Vetrina…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:border-gray-400"
              autoFocus
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-gray-200 text-gray-500 text-sm hover:bg-gray-50 transition-colors"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={saving || !nome.trim()}
              className="flex-1 py-2.5 rounded-lg bg-primary text-white text-sm font-medium disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              Crea layout
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ModaPareti() {
  const router = useRouter();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading } = useQuery<{ data: PareteAttrezzata[] }>({
    queryKey: ['moda-pareti'],
    queryFn: () => fetch('/api/moda/pareti').then((r) => r.json()),
    staleTime: 30_000,
  });

  const pareti = data?.data ?? [];

  async function deleteParete(id: string) {
    if (!confirm('Eliminare questo layout?')) return;
    try {
      const res = await fetch(`/api/moda/pareti/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success('Layout eliminato');
      qc.invalidateQueries({ queryKey: ['moda-pareti'] });
    } catch {
      toast.error('Errore durante l\'eliminazione');
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-gray-50/95 backdrop-blur border-b border-gray-100 px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-700 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <p className="text-xs text-gray-400 uppercase tracking-widest">Moda PE27</p>
            <h1 className="text-base font-semibold text-gray-900">Visual</h1>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-xs font-medium rounded-xl hover:bg-primary/90 transition-colors"
          >
            <Plus size={14} /> Nuovo
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-40 bg-gray-200 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : pareti.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-300">
            <Layout size={40} className="mb-4" />
            <p className="text-sm font-medium text-gray-500">Nessun layout</p>
            <p className="text-xs mt-1 text-gray-400">Simula l'esposizione in negozio</p>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-5 px-5 py-2.5 bg-primary text-white text-sm rounded-xl font-medium flex items-center gap-2 hover:bg-primary/90 transition-colors"
            >
              <Plus size={14} /> Crea layout
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {pareti.map((p) => {
              const config = Array.isArray(p.configurazione) ? p.configurazione as any[] : [];
              const nBarre = config.filter((e: any) => e.tipo === 'barra').length;
              const nMensole = config.filter((e: any) => e.tipo === 'mensola').length;
              const nFrontali = config.filter((e: any) => e.tipo === 'frontale').length;
              const nCapi = config.reduce((acc: number, e: any) => acc + (e.items?.length ?? 0), 0);

              return (
                <div
                  key={p.id}
                  className="group relative rounded-2xl border border-gray-200 bg-white hover:border-gray-300 transition-all cursor-pointer shadow-sm"
                  onClick={() => router.push(`/moda/pareti/${p.id}`)}
                >
                  {/* Wall preview thumbnail */}
                  <div className="h-32 px-4 pt-4 pb-2 flex flex-col gap-1.5 bg-gray-50 rounded-t-2xl">
                    {config.length === 0 ? (
                      <div className="flex-1 flex items-center justify-center">
                        <p className="text-xs text-gray-300">Vuoto — clicca per configurare</p>
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col gap-1 overflow-hidden">
                        {config.slice(0, 5).map((el: any) => (
                          <WallElementPreview key={el.id} element={el} />
                        ))}
                        {config.length > 5 && (
                          <p className="text-2xs text-gray-400 text-center">+{config.length - 5} elementi</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-900">{p.nome}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {config.length === 0
                        ? 'Vuoto'
                        : [
                            nBarre > 0 && `${nBarre} barra${nBarre > 1 ? 'e' : ''}`,
                            nMensole > 0 && `${nMensole} mensola${nMensole > 1 ? 'e' : ''}`,
                            nFrontali > 0 && `${nFrontali} frontale${nFrontali > 1 ? 'i' : ''}`,
                            nCapi > 0 && `${nCapi} capi`,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                    </p>
                  </div>

                  {/* Delete */}
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteParete(p.id); }}
                    className="absolute top-3 right-3 w-7 h-7 bg-white border border-gray-200 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all shadow-sm"
                  >
                    <X size={13} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showCreate && (
        <CreatePareteModal
          onClose={() => setShowCreate(false)}
          onCreated={() => qc.invalidateQueries({ queryKey: ['moda-pareti'] })}
        />
      )}
    </div>
  );
}

function WallElementPreview({ element }: { element: any }) {
  const items: any[] = element.items ?? [];
  if (element.tipo === 'barra') {
    return (
      <div className="flex items-center gap-0.5 h-5">
        <span className="text-2xs text-gray-400 w-10 flex-shrink-0 font-mono">barra</span>
        <div className="flex-1 border-t border-gray-300 relative">
          <div className="flex gap-0.5 mt-0.5">
            {items.slice(0, 12).map((it: any, i: number) => (
              <div
                key={i}
                className="w-3.5 h-3 rounded-sm flex-shrink-0"
                style={{ backgroundColor: it.coloreHex ?? colorForTipo(it.tipo) }}
                title={`${it.tipo}${it.productCode ? ` — ${it.productCode}` : ''}`}
              />
            ))}
            {items.length > 12 && <span className="text-2xs text-gray-400">+{items.length - 12}</span>}
          </div>
        </div>
      </div>
    );
  }
  if (element.tipo === 'mensola') {
    return (
      <div className="flex items-center gap-0.5 h-5">
        <span className="text-2xs text-gray-400 w-10 flex-shrink-0 font-mono">{element.dimensione ?? 'mens.'}</span>
        <div className="flex-1 border-b border-gray-300 flex gap-0.5 pb-0.5">
          {items.slice(0, 10).map((it: any, i: number) => (
            <div
              key={i}
              className="w-4 h-2.5 rounded-sm flex-shrink-0"
              style={{ backgroundColor: it.coloreHex ?? colorForTipo(it.tipo) }}
              title={it.tipo}
            />
          ))}
        </div>
      </div>
    );
  }
  if (element.tipo === 'frontale') {
    const it = items[0];
    return (
      <div className="flex items-center gap-0.5 h-5">
        <span className="text-2xs text-gray-400 w-10 flex-shrink-0 font-mono">front.</span>
        <div
          className="w-8 h-4 rounded border border-gray-200 flex-shrink-0"
          style={{ backgroundColor: it?.coloreHex ?? '#d1d5db' }}
          title={it?.tipo ?? 'frontale'}
        />
        {it && <span className="text-2xs text-gray-400 ml-1 truncate">{it.productCode ?? it.tipo}</span>}
      </div>
    );
  }
  return null;
}

function colorForTipo(tipo: string): string {
  const map: Record<string, string> = {
    top: '#4f7c9c', bottom: '#6b5a8c', abito: '#8c5a7c',
    capospalla: '#4a6b4a', borsa: '#8c7a4a', accessorio: '#8c6a4a', altro: '#9ca3af',
  };
  return map[tipo] ?? '#9ca3af';
}
