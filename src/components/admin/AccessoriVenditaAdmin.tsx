'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, ExternalLink, Tag, X, Check, Loader2, Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';

type TipoTarget = 'collana' | 'bracciale' | 'orecchini' | 'universale';

const TIPO_OPTIONS: { value: TipoTarget; label: string }[] = [
  { value: 'collana',    label: 'Collane' },
  { value: 'bracciale',  label: 'Bracciali' },
  { value: 'orecchini',  label: 'Orecchini' },
  { value: 'universale', label: 'Universale (tutti)' },
];

interface Accessorio {
  id: string;
  code: string;
  name: string;
  retailPrice: number;
  costPrice: number;
  misura: string | null;
  imageUrl: string | null;
  note: string | null;
  colore: string | null;
  linkAcquisto: string | null;
  tipoTarget: TipoTarget[];
  isActive: boolean;
}

const EMPTY: Omit<Accessorio, 'id'> = {
  code: '', name: '', retailPrice: 0, costPrice: 0,
  misura: '', imageUrl: '', note: '', colore: '', linkAcquisto: '',
  tipoTarget: [], isActive: true,
};

function euro(n: number) {
  return '€ ' + n.toFixed(2).replace('.', ',');
}

function TipoBadge({ tipo }: { tipo: TipoTarget }) {
  const colors: Record<TipoTarget, string> = {
    collana:    'bg-rose-50 text-rose-700 border-rose-200',
    bracciale:  'bg-amber-50 text-amber-700 border-amber-200',
    orecchini:  'bg-violet-50 text-violet-700 border-violet-200',
    universale: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };
  const labels: Record<TipoTarget, string> = {
    collana: 'Collana', bracciale: 'Bracciale', orecchini: 'Orecchini', universale: 'Universale',
  };
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-2xs font-medium border ${colors[tipo]}`}>
      {labels[tipo]}
    </span>
  );
}

function AccessorioForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial: Omit<Accessorio, 'id'>;
  onSave: (data: Omit<Accessorio, 'id'>) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState(initial);

  function set(key: keyof typeof form, value: any) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function toggleTipo(t: TipoTarget) {
    set('tipoTarget', form.tipoTarget.includes(t)
      ? form.tipoTarget.filter((x) => x !== t)
      : [...form.tipoTarget, t]);
  }

  const labelCls = 'block text-xs font-medium text-gray-500 mb-1';
  const inputCls = 'w-full border border-border rounded px-3 py-2 text-sm text-primary focus:outline-none focus:ring-1 focus:ring-primary bg-white';

  return (
    <div className="space-y-4">
      {/* Codice + Nome */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Codice *</label>
          <input className={inputCls} value={form.code} onChange={(e) => set('code', e.target.value)} placeholder="es. BUST-01" />
        </div>
        <div>
          <label className={labelCls}>Nome *</label>
          <input className={inputCls} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Busto portacollane" />
        </div>
      </div>

      {/* Prezzi */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Prezzo vendita i.i. (€) *</label>
          <input className={inputCls} type="number" step="0.01" min="0" value={form.retailPrice || ''} onChange={(e) => set('retailPrice', parseFloat(e.target.value) || 0)} />
        </div>
        <div>
          <label className={labelCls}>Costo i.e. (€) *</label>
          <input className={inputCls} type="number" step="0.01" min="0" value={form.costPrice || ''} onChange={(e) => set('costPrice', parseFloat(e.target.value) || 0)} />
        </div>
      </div>

      {/* Misura + Colore */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Misure</label>
          <input className={inputCls} value={form.misura ?? ''} onChange={(e) => set('misura', e.target.value)} placeholder="es. 30x15x10 cm" />
        </div>
        <div>
          <label className={labelCls}>Colore</label>
          <input className={inputCls} value={form.colore ?? ''} onChange={(e) => set('colore', e.target.value)} placeholder="es. Naturale" />
        </div>
      </div>

      {/* Foto URL */}
      <div>
        <label className={labelCls}>URL foto</label>
        <input className={inputCls} value={form.imageUrl ?? ''} onChange={(e) => set('imageUrl', e.target.value)} placeholder="https://..." />
      </div>

      {/* Link acquisto */}
      <div>
        <label className={labelCls}>Link acquisto (Demetra)</label>
        <input className={inputCls} value={form.linkAcquisto ?? ''} onChange={(e) => set('linkAcquisto', e.target.value)} placeholder="https://demetra..." />
      </div>

      {/* Note */}
      <div>
        <label className={labelCls}>Note</label>
        <textarea className={`${inputCls} resize-none`} rows={2} value={form.note ?? ''} onChange={(e) => set('note', e.target.value)} />
      </div>

      {/* Tipo destinatario */}
      <div>
        <label className={labelCls}>Mostra con *</label>
        <div className="flex flex-wrap gap-2">
          {TIPO_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => toggleTipo(value)}
              className={`px-3 py-1.5 rounded border text-xs font-medium transition-colors ${
                form.tipoTarget.includes(value)
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-gray-500 border-border hover:border-primary'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Attivo */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={form.isActive} onChange={(e) => set('isActive', e.target.checked)} className="rounded border-border" />
        <span className="text-sm text-gray-600">Attivo</span>
      </label>

      {/* Azioni */}
      <div className="flex gap-2 pt-2">
        <button onClick={onCancel} className="flex-1 py-2 border border-border rounded text-sm text-gray-500 hover:bg-cream">
          Annulla
        </button>
        <button
          onClick={() => onSave(form)}
          disabled={saving || !form.code.trim() || !form.name.trim() || form.tipoTarget.length === 0}
          className="flex-1 py-2 bg-primary text-white rounded text-sm hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-1.5"
        >
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
          Salva
        </button>
      </div>
    </div>
  );
}

export default function AccessoriVenditaAdmin() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Omit<Accessorio, 'id'>>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: items = [], isLoading } = useQuery<Accessorio[]>({
    queryKey: ['admin-accessori-vendita'],
    queryFn: () => fetch('/api/admin/accessori-vendita').then((r) => r.json()).then((d) => d.data),
  });

  async function handleSave(data: Omit<Accessorio, 'id'>) {
    setSaving(true);
    try {
      const url = editingId ? `/api/admin/accessori-vendita/${editingId}` : '/api/admin/accessori-vendita';
      const method = editingId ? 'PATCH' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'Errore');
      qc.invalidateQueries({ queryKey: ['admin-accessori-vendita'] });
      toast.success(editingId ? 'Accessorio aggiornato' : 'Accessorio creato');
      setShowForm(false);
      setEditingId(null);
    } catch (e: any) {
      toast.error(e.message ?? 'Errore');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/accessori-vendita/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Errore eliminazione');
      qc.invalidateQueries({ queryKey: ['admin-accessori-vendita'] });
      toast.success('Eliminato');
    } catch (e: any) {
      toast.error(e.message ?? 'Errore');
    } finally {
      setDeletingId(null);
    }
  }

  function startEdit(item: Accessorio) {
    setEditingId(item.id);
    setEditData({ code: item.code, name: item.name, retailPrice: item.retailPrice, costPrice: item.costPrice, misura: item.misura, imageUrl: item.imageUrl, note: item.note, colore: item.colore, linkAcquisto: item.linkAcquisto, tipoTarget: item.tipoTarget, isActive: item.isActive });
    setShowForm(true);
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-primary">Accessori alla vendita</h1>
          <p className="text-sm text-gray-400 mt-0.5">Espositivi e display da suggerire ai clienti bigiotteria</p>
        </div>
        {!showForm && (
          <button
            onClick={() => { setEditingId(null); setEditData(EMPTY); setShowForm(true); }}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded text-sm hover:opacity-90"
          >
            <Plus size={14} /> Nuovo accessorio
          </button>
        )}
      </div>

      {/* Form panel */}
      {showForm && (
        <div className="bg-white border border-border rounded-xl p-5 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-primary">{editingId ? 'Modifica accessorio' : 'Nuovo accessorio'}</h2>
            <button onClick={() => { setShowForm(false); setEditingId(null); }} className="text-gray-400 hover:text-primary">
              <X size={16} />
            </button>
          </div>
          <AccessorioForm initial={editData} onSave={handleSave} onCancel={() => { setShowForm(false); setEditingId(null); }} saving={saving} />
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-gray-400" /></div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">Nessun accessorio creato.</div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className={`bg-white border border-border rounded-xl p-4 flex gap-4 items-start shadow-sm ${!item.isActive ? 'opacity-50' : ''}`}>
              {/* Foto */}
              <div className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden border border-border bg-cream flex items-center justify-center">
                {item.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon size={20} className="text-gray-300" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2 flex-wrap">
                  <span className="text-xs font-mono text-gray-400">{item.code}</span>
                  <span className="text-sm font-medium text-primary">{item.name}</span>
                  {!item.isActive && <span className="text-2xs text-gray-400 italic">inattivo</span>}
                </div>
                <div className="flex gap-3 mt-1 text-xs text-gray-500">
                  <span>Vendita: <strong className="text-primary">{euro(item.retailPrice)}</strong></span>
                  <span>Costo: {euro(item.costPrice)}</span>
                  {item.misura && <span>{item.misura}</span>}
                  {item.colore && <span>{item.colore}</span>}
                </div>
                <div className="flex gap-1 mt-2 flex-wrap">
                  {item.tipoTarget.map((t) => <TipoBadge key={t} tipo={t as TipoTarget} />)}
                </div>
                {item.note && <p className="text-xs text-gray-400 mt-1 italic">{item.note}</p>}
                {item.linkAcquisto && (
                  <a href={item.linkAcquisto} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-2xs text-blue-500 hover:underline mt-1">
                    <ExternalLink size={10} /> Link Demetra
                  </a>
                )}
              </div>

              {/* Azioni */}
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={() => startEdit(item)} className="p-2 text-gray-400 hover:text-primary rounded hover:bg-cream transition-colors">
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  disabled={deletingId === item.id}
                  className="p-2 text-gray-400 hover:text-red-500 rounded hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  {deletingId === item.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
