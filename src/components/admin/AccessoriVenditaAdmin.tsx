'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, ExternalLink, Check, X, Loader2, ShoppingBag, ImageIcon, Plus, Copy, Link2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import type { TipoSupporto, TonoLegno } from '@/types/jewelry';
import { LABEL_SUPPORTO } from '@/types/jewelry';

const TIPI_VENDIBILI: TipoSupporto[] = ['busto_legno', 'cono_legno', 'portaorecchini', 'espositore_onearth'];

interface Supporto {
  id: string;
  nome: string;
  codice: string | null;
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

interface FotoItem {
  path: string;
  name: string;
  url: string;
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

function FotoPickerModal({ onSelect, onClose }: { onSelect: (url: string) => void; onClose: () => void }) {
  const { data: photos = [], isLoading } = useQuery<FotoItem[]>({
    queryKey: ['admin-foto-picker'],
    queryFn: () => fetch('/api/admin/foto').then((r) => r.json()).then((d) => d.data ?? []),
    staleTime: 60_000,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-3xl flex flex-col" style={{ maxHeight: '80vh' }}>
        <div className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
          <span className="text-sm font-semibold text-primary">Scegli foto da infoto</span>
          <button onClick={onClose} className="p-1 hover:text-primary text-gray-400 rounded"><X size={16} /></button>
        </div>
        <div className="overflow-y-auto p-4 flex-1">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-gray-400" /></div>
          ) : photos.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Nessuna foto in infoto.</p>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {photos.map((p) => (
                <button
                  key={p.path}
                  onClick={() => { onSelect(p.url); onClose(); }}
                  className="aspect-square overflow-hidden rounded-lg border border-border hover:ring-2 ring-primary transition-all bg-cream"
                  title={p.name}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt={p.name} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InlineEditor({
  supporto,
  onSaved,
}: {
  supporto: Supporto;
  onSaved: (updated: Partial<Supporto>) => void;
}) {
  const [form, setForm] = useState({
    nome:         supporto.nome ?? '',
    immagineUrl:  supporto.immagineUrl ?? '',
    codice:       supporto.codice ?? '',
    retailPrice:  supporto.retailPrice ?? '',
    costPrice:    supporto.costPrice ?? '',
    misura:       supporto.misura ?? '',
    note:         supporto.note ?? '',
    linkAcquisto: supporto.linkAcquisto ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [linking, setLinking] = useState(false);

  const labelCls = 'block text-xs font-medium text-gray-500 mb-1';
  const inputCls = 'w-full border border-border rounded px-3 py-1.5 text-sm text-primary focus:outline-none focus:ring-1 focus:ring-primary bg-white';

  async function collegaDaCodice() {
    const codice = form.codice.trim().toUpperCase();
    if (!codice) { toast.error('Inserisci prima un codice'); return; }
    setLinking(true);
    try {
      const res = await fetch('/api/admin/foto');
      const body = await res.json();
      const foto: { parsedCode: string | null; url: string }[] = body.data ?? [];
      const match = foto.find((f) => f.parsedCode?.toUpperCase() === codice);
      if (!match) {
        toast.error(`Nessuna foto trovata in infoto per il codice "${codice}"`);
        return;
      }
      setForm((f) => ({ ...f, immagineUrl: match.url }));
      toast.success('Foto collegata — ricorda di salvare');
    } catch {
      toast.error('Errore durante la ricerca in infoto');
    } finally {
      setLinking(false);
    }
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/accessori-vendita/${supporto.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome:         form.nome.trim() || null,
          immagineUrl:  form.immagineUrl.trim() || null,
          codice:       form.codice.trim() || null,
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
    <>
      {pickerOpen && (
        <FotoPickerModal
          onSelect={(url) => setForm((f) => ({ ...f, immagineUrl: url }))}
          onClose={() => setPickerOpen(false)}
        />
      )}
      <div className="mt-4 space-y-3 border-t border-border pt-4">
        <div>
          <label className={labelCls}>Nome</label>
          <input className={inputCls} value={form.nome}
            onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
            placeholder="es. Busto legno chiaro 30cm" />
        </div>

        {/* Immagine */}
        <div>
          <label className={labelCls}>Foto</label>
          <div className="flex gap-2 items-start">
            <div className="w-14 h-14 flex-shrink-0 rounded-lg overflow-hidden border border-border bg-cream flex items-center justify-center">
              {form.immagineUrl
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={form.immagineUrl} alt="" className="w-full h-full object-cover" />
                : <ImageIcon size={16} className="text-gray-300" />}
            </div>
            <div className="flex-1 space-y-1.5">
              <input
                className={inputCls}
                value={form.immagineUrl}
                onChange={(e) => setForm((f) => ({ ...f, immagineUrl: e.target.value }))}
                placeholder="https://..."
              />
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setPickerOpen(true)}
                  className="text-xs text-accent hover:underline flex items-center gap-1"
                >
                  <ImageIcon size={11} /> Scegli da infoto
                </button>
                <button
                  type="button"
                  onClick={collegaDaCodice}
                  disabled={linking || !form.codice.trim()}
                  className="text-xs text-blue-500 hover:underline flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {linking ? <Loader2 size={11} className="animate-spin" /> : <Link2 size={11} />}
                  Collega da codice
                </button>
              </div>
            </div>
          </div>
        </div>

        <div>
          <label className={labelCls}>Codice articolo</label>
          <input className={inputCls} value={form.codice}
            onChange={(e) => setForm((f) => ({ ...f, codice: e.target.value }))}
            placeholder="es. BU-LGN-CH-01" />
        </div>

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
          Salva
        </button>
      </div>
    </>
  );
}

function CreaAccessorioModal({ onSaved, onClose }: { onSaved: (item: Supporto) => void; onClose: () => void }) {
  const [form, setForm] = useState({ nome: '', tipo: 'busto_legno' as TipoSupporto, tono: '' as TonoLegno | '', immagineUrl: '', codice: '', retailPrice: '' as number | '', costPrice: '' as number | '', misura: '', note: '', linkAcquisto: '' });
  const [saving, setSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const inp = 'w-full border border-border rounded px-3 py-1.5 text-sm text-primary focus:outline-none focus:ring-1 focus:ring-primary bg-white';

  async function save() {
    if (!form.nome.trim()) { toast.error('Nome obbligatorio'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/admin/accessori-vendita', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, tono: form.tono || null, retailPrice: form.retailPrice !== '' ? Number(form.retailPrice) : null, costPrice: form.costPrice !== '' ? Number(form.costPrice) : null }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'Errore');
      onSaved(body.data);
      toast.success('Accessorio creato');
    } catch (e: any) {
      toast.error(e.message ?? 'Errore');
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg p-5 space-y-4">
        {pickerOpen && <FotoPickerModal onSelect={(url) => { setForm(f => ({ ...f, immagineUrl: url })); setPickerOpen(false); }} onClose={() => setPickerOpen(false)} />}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-primary">Nuovo supporto espositivo</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-primary"><X size={16} /></button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="block text-xs text-gray-500 mb-1">Nome *</label>
            <input className={inp} value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="es. Busto legno chiaro M" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Tipo *</label>
            <select className={inp} value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value as TipoSupporto }))}>
              {TIPI_VENDIBILI.map(t => <option key={t} value={t}>{LABEL_SUPPORTO[t]}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Tono</label>
            <select className={inp} value={form.tono} onChange={e => setForm(f => ({ ...f, tono: e.target.value as TonoLegno | '' }))}>
              <option value="">—</option>
              <option value="chiaro">Legno chiaro</option>
              <option value="scuro">Legno scuro</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Prezzo vendita €</label>
            <input className={inp} type="number" step="0.01" value={form.retailPrice} onChange={e => setForm(f => ({ ...f, retailPrice: e.target.value === '' ? '' : parseFloat(e.target.value) }))} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Costo €</label>
            <input className={inp} type="number" step="0.01" value={form.costPrice} onChange={e => setForm(f => ({ ...f, costPrice: e.target.value === '' ? '' : parseFloat(e.target.value) }))} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Codice</label>
            <input className={inp} value={form.codice} onChange={e => setForm(f => ({ ...f, codice: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Misura</label>
            <input className={inp} value={form.misura} onChange={e => setForm(f => ({ ...f, misura: e.target.value }))} />
          </div>
          <div className="col-span-2">
            <label className="block text-xs text-gray-500 mb-1">Foto</label>
            <div className="flex gap-2">
              <input className={`${inp} flex-1`} value={form.immagineUrl} onChange={e => setForm(f => ({ ...f, immagineUrl: e.target.value }))} placeholder="URL immagine" />
              <button type="button" onClick={() => setPickerOpen(true)} className="px-3 py-1.5 text-xs border border-border rounded hover:bg-cream transition-colors flex-shrink-0">Scegli</button>
            </div>
          </div>
          <div className="col-span-2">
            <label className="block text-xs text-gray-500 mb-1">Link Demetra</label>
            <input className={inp} value={form.linkAcquisto} onChange={e => setForm(f => ({ ...f, linkAcquisto: e.target.value }))} />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-3 py-1.5 text-xs border border-border rounded hover:bg-cream transition-colors">Annulla</button>
          <button onClick={save} disabled={saving} className="px-4 py-1.5 text-xs bg-primary text-white rounded hover:bg-warm-darker transition-colors disabled:opacity-50">
            {saving ? <Loader2 size={13} className="animate-spin" /> : 'Crea'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AccessoriVenditaAdmin() {
  const qc = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

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

  function handleCreated(item: Supporto) {
    qc.setQueryData<Supporto[]>(['admin-accessori-vendita'], (old = []) => [...old, item]);
    setShowCreate(false);
  }

  async function handleDuplicate(id: string) {
    try {
      const res = await fetch('/api/admin/accessori-vendita', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId: id }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'Errore');
      qc.setQueryData<Supporto[]>(['admin-accessori-vendita'], (old = []) => [...old, body.data]);
      toast.success('Duplicato');
    } catch (e: any) {
      toast.error(e.message ?? 'Errore');
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {showCreate && <CreaAccessorioModal onSaved={handleCreated} onClose={() => setShowCreate(false)} />}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-primary">Supporti espositivi</h1>
          <p className="text-sm text-gray-400 mt-0.5">Gestisci i supporti espositivi vendibili: nome, prezzi, foto e link Demetra.</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-primary text-white rounded-lg hover:bg-warm-darker transition-colors flex-shrink-0"
        >
          <Plus size={13} /> Nuovo
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-gray-400" /></div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          Nessun supporto. Clicca <button onClick={() => setShowCreate(true)} className="text-accent hover:underline">+ Nuovo</button> per aggiungerne.
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
                    {item.codice && <span className="text-2xs font-mono text-gray-500 bg-gray-50 border border-gray-200 px-1.5 py-0.5 rounded">{item.codice}</span>}
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

                {/* Azioni */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => handleDuplicate(item.id)}
                    className="p-2 text-gray-400 hover:text-primary rounded hover:bg-cream transition-colors"
                    title="Duplica"
                  >
                    <Copy size={13} />
                  </button>
                  <button
                    onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                    className="p-2 text-gray-400 hover:text-primary rounded hover:bg-cream transition-colors"
                    title="Modifica"
                  >
                    {expandedId === item.id ? <X size={14} /> : <Pencil size={14} />}
                  </button>
                </div>
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
