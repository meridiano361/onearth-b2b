'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, ExternalLink, Check, X, Loader2, ShoppingBag } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import type { TipoSupporto } from '@/types/jewelry';
import { LABEL_SUPPORTO } from '@/types/jewelry';

interface Supporto {
  id: string;
  nome: string;
  tipo: TipoSupporto;
  tipoLabel: string;
  tono: 'chiaro' | 'scuro' | null;
  immagineUrl: string;
  attivo: boolean;
  retailPrice: number | null;
  costPrice: number | null;
  misura: string | null;
  note: string | null;
  linkAcquisto: string | null;
}

function euro(n: number | null) {
  if (n == null) return '—';
  return '€ ' + n.toFixed(2).replace('.', ',');
}

const TIPO_COLOR: Record<TipoSupporto, string> = {
  busto_legno:        'bg-rose-50 text-rose-700 border-rose-200',
  cono_legno:         'bg-amber-50 text-amber-700 border-amber-200',
  portaorecchini:     'bg-violet-50 text-violet-700 border-violet-200',
  parete_ganci:       'bg-gray-50 text-gray-500 border-gray-200',
  espositore_onearth: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

function InlineEditor({
  supporto,
  onSaved,
}: {
  supporto: Supporto;
  onSaved: (updated: Partial<Supporto>) => void;
}) {
  const [form, setForm] = useState({
    retailPrice: supporto.retailPrice ?? '',
    costPrice:   supporto.costPrice ?? '',
    misura:      supporto.misura ?? '',
    note:        supporto.note ?? '',
    linkAcquisto: supporto.linkAcquisto ?? '',
  });
  const [saving, setSaving] = useState(false);

  const labelCls = 'block text-xs font-medium text-gray-500 mb-1';
  const inputCls = 'w-full border border-border rounded px-3 py-1.5 text-sm text-primary focus:outline-none focus:ring-1 focus:ring-primary bg-white';

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/accessori-vendita/${supporto.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          retailPrice:  form.retailPrice !== '' ? parseFloat(String(form.retailPrice)) : null,
          costPrice:    form.costPrice   !== '' ? parseFloat(String(form.costPrice))   : null,
          misura:       form.misura || null,
          note:         form.note   || null,
          linkAcquisto: form.linkAcquisto || null,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'Errore');
      onSaved(body.data);
      toast.success('Salvato');
    } catch (e: any) {
      toast.error(e.message ?? 'Errore');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-4 space-y-3 border-t border-border pt-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Prezzo vendita i.i. (€)</label>
          <input className={inputCls} type="number" step="0.01" min="0"
            value={form.retailPrice}
            onChange={(e) => setForm((f) => ({ ...f, retailPrice: e.target.value }))} />
        </div>
        <div>
          <label className={labelCls}>Costo i.e. (€)</label>
          <input className={inputCls} type="number" step="0.01" min="0"
            value={form.costPrice}
            onChange={(e) => setForm((f) => ({ ...f, costPrice: e.target.value }))} />
        </div>
      </div>
      <div>
        <label className={labelCls}>Misure</label>
        <input className={inputCls} value={form.misura}
          onChange={(e) => setForm((f) => ({ ...f, misura: e.target.value }))}
          placeholder="es. 30×15×10 cm" />
      </div>
      <div>
        <label className={labelCls}>Link acquisto (Demetra)</label>
        <input className={inputCls} value={form.linkAcquisto}
          onChange={(e) => setForm((f) => ({ ...f, linkAcquisto: e.target.value }))}
          placeholder="https://..." />
      </div>
      <div>
        <label className={labelCls}>Note</label>
        <textarea className={`${inputCls} resize-none`} rows={2} value={form.note}
          onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} />
      </div>
      <button
        onClick={save}
        disabled={saving}
        className="w-full py-2 bg-primary text-white rounded text-sm hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-1.5"
      >
        {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
        Salva campi commerciali
      </button>
    </div>
  );
}

export default function AccessoriVenditaAdmin() {
  const qc = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: items = [], isLoading } = useQuery<Supporto[]>({
    queryKey: ['admin-accessori-vendita'],
    queryFn: () => fetch('/api/admin/accessori-vendita').then((r) => r.json()).then((d) => d.data),
  });

  function handleSaved(id: string, updated: Partial<Supporto>) {
    qc.setQueryData<Supporto[]>(['admin-accessori-vendita'], (old = []) =>
      old.map((s) => (s.id === id ? { ...s, ...updated } : s)),
    );
    setExpandedId(null);
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-primary">Accessori alla vendita</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Imposta prezzi e link Demetra per i supporti espositivi. Per aggiungere nuovi supporti usa{' '}
            <Link href="/admin/visual/bigiotteria" className="text-accent hover:underline">Visual › Bigiotteria</Link>.
          </p>
        </div>
        <ShoppingBag size={20} className="text-gray-300 mt-1 flex-shrink-0" />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-gray-400" /></div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          Nessun supporto creato.{' '}
          <Link href="/admin/visual/bigiotteria" className="text-accent hover:underline">Vai a Visual › Bigiotteria</Link> per aggiungerne.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className={`bg-white border border-border rounded-xl p-4 shadow-sm ${!item.attivo ? 'opacity-50' : ''}`}>
              <div className="flex gap-4 items-start">
                {/* Foto */}
                <div className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden border border-border bg-cream flex items-center justify-center">
                  {item.immagineUrl
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={item.immagineUrl} alt={item.nome} className="w-full h-full object-cover" />
                    : <ShoppingBag size={20} className="text-gray-300" />}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-primary">{item.nome}</span>
                    {!item.attivo && <span className="text-2xs text-gray-400 italic">inattivo</span>}
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-2xs font-medium border ${TIPO_COLOR[item.tipo]}`}>
                      {item.tipoLabel}
                    </span>
                    {item.tono && <span className="text-2xs text-gray-400">{item.tono === 'chiaro' ? 'Legno chiaro' : 'Legno scuro'}</span>}
                  </div>
                  <div className="flex gap-4 mt-1 text-xs text-gray-500">
                    <span>Vendita: <strong className={item.retailPrice ? 'text-primary' : 'text-gray-300'}>{euro(item.retailPrice)}</strong></span>
                    <span>Costo: <span className={item.costPrice ? '' : 'text-gray-300'}>{euro(item.costPrice)}</span></span>
                    {item.misura && <span>{item.misura}</span>}
                  </div>
                  {item.note && <p className="text-xs text-gray-400 italic mt-0.5">{item.note}</p>}
                  {item.linkAcquisto && (
                    <a href={item.linkAcquisto} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-2xs text-blue-500 hover:underline mt-1">
                      <ExternalLink size={10} /> Link Demetra
                    </a>
                  )}
                </div>

                {/* Azione */}
                <button
                  onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                  className="p-2 text-gray-400 hover:text-primary rounded hover:bg-cream transition-colors flex-shrink-0"
                >
                  {expandedId === item.id ? <X size={14} /> : <Pencil size={14} />}
                </button>
              </div>

              {expandedId === item.id && (
                <InlineEditor
                  supporto={item}
                  onSaved={(updated) => handleSaved(item.id, updated)}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
