'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Edit2, X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface SogliaVolume {
  soglia: number;
  extra: number;
}

interface CondizioniCommerciali {
  id: string;
  conferente: string;
  collezione: string;
  scontoConReso: number | null;
  percentualeReso: number | null;
  noteReso: string | null;
  scontoSenzaReso: number | null;
  extraScontoVolume: SogliaVolume[] | null;
  importoMinimoIe: number | null;
  consegna: string | null;
  pagamentoGg: number | null;
  condizioniRiordini: string | null;
  note: string | null;
}

type FormState = {
  conferente: string;
  collezione: string;
  scontoConReso: string;
  percentualeReso: string;
  noteReso: string;
  scontoSenzaReso: string;
  extraScontoVolume: SogliaVolume[];
  importoMinimoIe: string;
  consegna: string;
  pagamentoGg: string;
  condizioniRiordini: string;
  note: string;
};

const EMPTY_FORM: FormState = {
  conferente: '',
  collezione: '',
  scontoConReso: '',
  percentualeReso: '',
  noteReso: '',
  scontoSenzaReso: '',
  extraScontoVolume: [],
  importoMinimoIe: '',
  consegna: '',
  pagamentoGg: '',
  condizioniRiordini: '',
  note: '',
};

function itemToForm(item: CondizioniCommerciali): FormState {
  return {
    conferente: item.conferente,
    collezione: item.collezione,
    scontoConReso: item.scontoConReso != null ? String(item.scontoConReso) : '',
    percentualeReso: item.percentualeReso != null ? String(item.percentualeReso) : '',
    noteReso: item.noteReso ?? '',
    scontoSenzaReso: item.scontoSenzaReso != null ? String(item.scontoSenzaReso) : '',
    extraScontoVolume: item.extraScontoVolume ?? [],
    importoMinimoIe: item.importoMinimoIe != null ? String(item.importoMinimoIe) : '',
    consegna: item.consegna ?? '',
    pagamentoGg: item.pagamentoGg != null ? String(item.pagamentoGg) : '',
    condizioniRiordini: item.condizioniRiordini ?? '',
    note: item.note ?? '',
  };
}

function formToBody(f: FormState) {
  return {
    conferente: f.conferente.trim(),
    collezione: f.collezione.trim(),
    scontoConReso: f.scontoConReso !== '' ? Number(f.scontoConReso) : null,
    percentualeReso: f.percentualeReso !== '' ? Number(f.percentualeReso) : null,
    noteReso: f.noteReso.trim() || null,
    scontoSenzaReso: f.scontoSenzaReso !== '' ? Number(f.scontoSenzaReso) : null,
    extraScontoVolume: f.extraScontoVolume.length > 0 ? f.extraScontoVolume : null,
    importoMinimoIe: f.importoMinimoIe !== '' ? Number(f.importoMinimoIe) : null,
    consegna: f.consegna.trim() || null,
    pagamentoGg: f.pagamentoGg !== '' ? Number(f.pagamentoGg) : null,
    condizioniRiordini: f.condizioniRiordini.trim() || null,
    note: f.note.trim() || null,
  };
}

function pct(n: number | null) {
  return n != null ? `${n}%` : '—';
}

function eur(n: number | null) {
  return n != null ? `€ ${n.toLocaleString('it-IT')}` : '—';
}

const inp =
  'w-full border border-border rounded px-3 py-1.5 text-sm text-primary focus:outline-none focus:ring-1 focus:ring-accent bg-white placeholder-gray-400';
const lbl = 'block text-xs font-medium text-gray-500 mb-1';
const sectionTitle = 'text-xs font-semibold text-primary uppercase tracking-wide mb-2';

function ExtraScontoEditor({
  value,
  onChange,
}: {
  value: SogliaVolume[];
  onChange: (v: SogliaVolume[]) => void;
}) {
  function addRow() {
    onChange([...value, { soglia: 0, extra: 0 }]);
  }

  function removeRow(i: number) {
    onChange(value.filter((_, idx) => idx !== i));
  }

  function updateRow(i: number, field: keyof SogliaVolume, raw: string) {
    const updated = value.map((row, idx) =>
      idx === i ? { ...row, [field]: raw === '' ? 0 : Number(raw) } : row,
    );
    onChange(updated);
  }

  return (
    <div className="space-y-1.5">
      {value.map((row, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-xs text-gray-400 flex-shrink-0">Se ordine &gt;</span>
          <div className="relative flex-1">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">€</span>
            <input
              type="number"
              min="0"
              step="1"
              value={row.soglia}
              onChange={(e) => updateRow(i, 'soglia', e.target.value)}
              className={`${inp} pl-6`}
            />
          </div>
          <span className="text-xs text-gray-400 flex-shrink-0">→ +</span>
          <div className="relative flex-1">
            <input
              type="number"
              min="0"
              step="0.1"
              value={row.extra}
              onChange={(e) => updateRow(i, 'extra', e.target.value)}
              className={`${inp} pr-6`}
            />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">%</span>
          </div>
          <button
            type="button"
            onClick={() => removeRow(i)}
            className="p-1.5 text-gray-400 hover:text-red-500 rounded hover:bg-red-50 transition-colors flex-shrink-0"
          >
            <X size={13} />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addRow}
        className="flex items-center gap-1 text-xs text-accent hover:underline mt-1"
      >
        <Plus size={12} /> Aggiungi soglia
      </button>
    </div>
  );
}

function CondizioniModal({
  item,
  onClose,
  onSaved,
  onDeleted,
}: {
  item: CondizioniCommerciali | null;
  onClose: () => void;
  onSaved: (data: CondizioniCommerciali) => void;
  onDeleted?: (id: string) => void;
}) {
  const isEdit = item != null;
  const [form, setForm] = useState<FormState>(item ? itemToForm(item) : EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  function set(field: keyof FormState, val: string | SogliaVolume[]) {
    setForm((f) => ({ ...f, [field]: val }));
  }

  async function save() {
    if (!form.conferente.trim()) { toast.error('Conferente obbligatorio'); return; }
    if (!form.collezione.trim()) { toast.error('Collezione obbligatoria'); return; }
    setSaving(true);
    try {
      const url = isEdit
        ? `/api/admin/condizioni-commerciali/${item!.id}`
        : '/api/admin/condizioni-commerciali';
      const method = isEdit ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formToBody(form)),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'Errore');
      onSaved(body.data);
      toast.success(isEdit ? 'Salvato' : 'Condizioni create');
    } catch (e: any) {
      toast.error(e.message ?? 'Errore');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!item) return;
    if (!confirm(`Eliminare le condizioni per ${item.conferente} – ${item.collezione}?`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/condizioni-commerciali/${item.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Errore');
      onDeleted?.(item.id);
      toast.success('Eliminato');
    } catch (e: any) {
      toast.error(e.message ?? 'Errore');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center overflow-y-auto py-8">
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 p-5 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-primary">
            {isEdit ? 'Modifica condizioni' : 'Nuove condizioni commerciali'}
          </h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-primary">
            <X size={16} />
          </button>
        </div>

        {/* Identificazione */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={lbl}>Conferente *</label>
            <input
              className={inp}
              value={form.conferente}
              onChange={(e) => set('conferente', e.target.value)}
              placeholder="es. Fornitore SRL"
            />
          </div>
          <div>
            <label className={lbl}>Collezione *</label>
            <input
              className={inp}
              value={form.collezione}
              onChange={(e) => set('collezione', e.target.value)}
              placeholder="es. PE27"
            />
          </div>
        </div>

        {/* Con Reso */}
        <div className="rounded-lg border border-border p-3 space-y-3">
          <p className={sectionTitle}>Con Reso</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Sconto %</label>
              <input
                className={inp}
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={form.scontoConReso}
                onChange={(e) => set('scontoConReso', e.target.value)}
                placeholder="es. 47"
              />
            </div>
            <div>
              <label className={lbl}>Percentuale reso %</label>
              <input
                className={inp}
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={form.percentualeReso}
                onChange={(e) => set('percentualeReso', e.target.value)}
                placeholder="es. 5"
              />
            </div>
          </div>
          <div>
            <label className={lbl}>Note reso</label>
            <input
              className={inp}
              value={form.noteReso}
              onChange={(e) => set('noteReso', e.target.value)}
              placeholder="es. esclusi prodotti KTS"
            />
          </div>
        </div>

        {/* Senza Reso */}
        <div className="rounded-lg border border-border p-3 space-y-3">
          <p className={sectionTitle}>Senza Reso</p>
          <div>
            <label className={lbl}>Sconto %</label>
            <input
              className={inp}
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={form.scontoSenzaReso}
              onChange={(e) => set('scontoSenzaReso', e.target.value)}
              placeholder="es. 50"
            />
          </div>
        </div>

        {/* Extra sconto volume */}
        <div className="rounded-lg border border-border p-3 space-y-2">
          <p className={sectionTitle}>Extra sconto a volume</p>
          <ExtraScontoEditor
            value={form.extraScontoVolume}
            onChange={(v) => setForm((f) => ({ ...f, extraScontoVolume: v }))}
          />
        </div>

        {/* Condizioni generali */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={lbl}>Importo minimo i.e. €</label>
            <input
              className={inp}
              type="number"
              min="0"
              step="1"
              value={form.importoMinimoIe}
              onChange={(e) => set('importoMinimoIe', e.target.value)}
              placeholder="es. 1500"
            />
          </div>
          <div>
            <label className={lbl}>Pagamento gg</label>
            <input
              className={inp}
              type="number"
              min="0"
              step="1"
              value={form.pagamentoGg}
              onChange={(e) => set('pagamentoGg', e.target.value)}
              placeholder="es. 60"
            />
          </div>
        </div>

        <div>
          <label className={lbl}>Consegna</label>
          <input
            className={inp}
            value={form.consegna}
            onChange={(e) => set('consegna', e.target.value)}
            placeholder="es. Febbraio 2027"
          />
        </div>

        <div>
          <label className={lbl}>Condizioni riordini</label>
          <textarea
            className={`${inp} resize-none`}
            rows={2}
            value={form.condizioniRiordini}
            onChange={(e) => set('condizioniRiordini', e.target.value)}
          />
        </div>

        <div>
          <label className={lbl}>Note</label>
          <textarea
            className={`${inp} resize-none`}
            rows={2}
            value={form.note}
            onChange={(e) => set('note', e.target.value)}
          />
        </div>

        {/* Azioni */}
        <div className="flex items-center justify-between gap-2 pt-1">
          {isEdit ? (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-red-50 text-red-600 border border-red-200 rounded hover:bg-red-100 transition-colors disabled:opacity-50"
            >
              {deleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
              Elimina
            </button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs border border-border rounded hover:bg-cream transition-colors"
            >
              Annulla
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium bg-primary text-white rounded hover:bg-warm-darker transition-colors disabled:opacity-50"
            >
              {saving && <Loader2 size={12} className="animate-spin" />}
              Salva
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CondizioniComercialiAdmin() {
  const qc = useQueryClient();
  const [modalItem, setModalItem] = useState<CondizioniCommerciali | null | 'new'>(null);

  const { data: items = [], isLoading } = useQuery<CondizioniCommerciali[]>({
    queryKey: ['admin-condizioni-commerciali'],
    queryFn: () =>
      fetch('/api/admin/condizioni-commerciali')
        .then((r) => r.json())
        .then((d) => d.data ?? []),
  });

  function handleSaved(data: CondizioniCommerciali) {
    qc.setQueryData<CondizioniCommerciali[]>(['admin-condizioni-commerciali'], (old = []) => {
      const exists = old.some((x) => x.id === data.id);
      return exists ? old.map((x) => (x.id === data.id ? data : x)) : [...old, data];
    });
    setModalItem(null);
  }

  function handleDeleted(id: string) {
    qc.setQueryData<CondizioniCommerciali[]>(['admin-condizioni-commerciali'], (old = []) =>
      old.filter((x) => x.id !== id),
    );
    setModalItem(null);
  }

  const modalItemOrNull = modalItem === 'new' ? null : modalItem;
  const modalOpen = modalItem !== null;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {modalOpen && (
        <CondizioniModal
          item={modalItemOrNull}
          onClose={() => setModalItem(null)}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
        />
      )}

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-primary">Condizioni Commerciali</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Sconti, reso, pagamenti e consegna per conferente e collezione.
          </p>
        </div>
        <button
          onClick={() => setModalItem('new')}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-primary text-white rounded-lg hover:bg-warm-darker transition-colors flex-shrink-0"
        >
          <Plus size={13} /> Aggiungi
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 size={20} className="animate-spin text-gray-400" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          Nessuna condizione commerciale.{' '}
          <button onClick={() => setModalItem('new')} className="text-accent hover:underline">
            + Aggiungi
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2.5 px-3 text-xs font-medium text-gray-500">Conferente</th>
                <th className="text-left py-2.5 px-3 text-xs font-medium text-gray-500">Collezione</th>
                <th className="text-right py-2.5 px-3 text-xs font-medium text-gray-500">CR%</th>
                <th className="text-right py-2.5 px-3 text-xs font-medium text-gray-500">Reso%</th>
                <th className="text-right py-2.5 px-3 text-xs font-medium text-gray-500">SR%</th>
                <th className="text-right py-2.5 px-3 text-xs font-medium text-gray-500">Min.ordine</th>
                <th className="text-left py-2.5 px-3 text-xs font-medium text-gray-500">Consegna</th>
                <th className="text-right py-2.5 px-3 text-xs font-medium text-gray-500">Pag.gg</th>
                <th className="py-2.5 px-3" />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-border/60 hover:bg-cream/50 transition-colors group"
                >
                  <td className="py-2.5 px-3 font-medium text-primary">{item.conferente}</td>
                  <td className="py-2.5 px-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-2xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {item.collezione}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-gray-600">
                    {pct(item.scontoConReso)}
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-gray-600">
                    {pct(item.percentualeReso)}
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-gray-600">
                    {pct(item.scontoSenzaReso)}
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-gray-600">
                    {eur(item.importoMinimoIe)}
                  </td>
                  <td className="py-2.5 px-3 text-gray-600">{item.consegna ?? '—'}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-gray-600">
                    {item.pagamentoGg != null ? `${item.pagamentoGg}gg` : '—'}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <button
                      onClick={() => setModalItem(item)}
                      className="p-1.5 text-gray-400 hover:text-primary rounded hover:bg-cream transition-colors opacity-0 group-hover:opacity-100"
                      title="Modifica"
                    >
                      <Edit2 size={13} />
                    </button>
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
