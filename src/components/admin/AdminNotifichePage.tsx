'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, Copy, Eye, EyeOff, Bell } from 'lucide-react';

type Notification = {
  id: string;
  titolo: string;
  testo: string;
  icona: string;
  tipo: string;
  coloreSfondo: string;
  coloreTesto: string;
  destinatari: string;
  dataInizio: string;
  dataScadenza: string | null;
  linkUrl: string | null;
  linkTesto: string | null;
  attiva: boolean;
  createdAt: string;
  _count: { reads: number };
};

const EMPTY: Omit<Notification, 'id' | 'createdAt' | '_count'> = {
  titolo: '',
  testo: '',
  icona: '📢',
  tipo: 'Informazione',
  coloreSfondo: '#000000',
  coloreTesto: '#FFFFFF',
  destinatari: 'tutti',
  dataInizio: new Date().toISOString().slice(0, 10),
  dataScadenza: null,
  linkUrl: null,
  linkTesto: null,
  attiva: false,
};

const TIPI = ['Informazione', 'Novità', 'Promozione', 'Avviso', 'Urgente'];
const PALETTE = ['#000000', '#111827', '#1E3A5F', '#065F46', '#7C2D12', '#4C1D95', '#831843', '#374151', '#FFFFFF', '#F5F0EA'];

function getStatus(n: Notification): { label: string; color: string } {
  const now = Date.now();
  if (!n.attiva) return { label: 'Bozza', color: 'bg-gray-100 text-gray-600' };
  if (n.dataScadenza && new Date(n.dataScadenza).getTime() < now) return { label: 'Scaduta', color: 'bg-red-100 text-red-600' };
  return { label: 'Attiva', color: 'bg-green-100 text-green-700' };
}

function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function Modal({
  initial,
  onClose,
  onSave,
}: {
  initial: Partial<Notification>;
  onClose: () => void;
  onSave: (data: Omit<Notification, 'id' | 'createdAt' | '_count'>) => Promise<void>;
}) {
  const [form, setForm] = useState<Omit<Notification, 'id' | 'createdAt' | '_count'>>({
    ...EMPTY,
    ...initial,
    dataInizio: initial.dataInizio ? initial.dataInizio.slice(0, 10) : EMPTY.dataInizio,
    dataScadenza: initial.dataScadenza ? initial.dataScadenza.slice(0, 10) : null,
  });
  const [saving, setSaving] = useState(false);

  function set<K extends keyof typeof form>(k: K, v: typeof form[K]) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  async function handleSubmit() {
    if (!form.titolo.trim()) { toast.error('Titolo obbligatorio'); return; }
    if (!form.testo.trim()) { toast.error('Testo obbligatorio'); return; }
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between sticky top-0 bg-white z-10">
          <h2 className="text-sm font-semibold text-primary">{initial.id ? 'Modifica notifica' : 'Nuova notifica'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-primary text-sm">✕</button>
        </div>

        <div className="p-6 space-y-4">
          {/* Titolo + Icona */}
          <div className="grid grid-cols-[1fr_80px] gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Titolo *</label>
              <input
                value={form.titolo}
                onChange={(e) => set('titolo', e.target.value)}
                placeholder="Es. Novità in catalogo"
                className="w-full border border-border rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-gray-900"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Icona</label>
              <input
                value={form.icona}
                onChange={(e) => set('icona', e.target.value)}
                placeholder="📢"
                className="w-full border border-border rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-gray-900 text-center text-lg"
              />
            </div>
          </div>

          {/* Testo */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Testo * (max 300 caratteri)</label>
            <textarea
              value={form.testo}
              onChange={(e) => set('testo', e.target.value.slice(0, 300))}
              rows={3}
              placeholder="Messaggio per i clienti…"
              className="w-full border border-border rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-gray-900 resize-none"
            />
            <p className="text-2xs text-gray-400 text-right">{form.testo.length}/300</p>
          </div>

          {/* Tipo + Destinatari */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Tipo</label>
              <select
                value={form.tipo}
                onChange={(e) => set('tipo', e.target.value)}
                className="w-full border border-border rounded px-2 py-2 text-sm outline-none focus:ring-1 focus:ring-gray-900"
              >
                {TIPI.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Destinatari</label>
              <select
                value={form.destinatari}
                onChange={(e) => set('destinatari', e.target.value)}
                className="w-full border border-border rounded px-2 py-2 text-sm outline-none focus:ring-1 focus:ring-gray-900"
              >
                <option value="tutti">Tutti (operator + clienti) — push/email</option>
                <option value="admin">Solo amministratori</option>
              </select>
            </div>
          </div>

          {/* Colori */}
          <div className="space-y-2">
            <label className="text-xs text-gray-500 block">Sfondo</label>
            <div className="flex flex-wrap gap-1.5 mb-1">
              {PALETTE.map((c) => (
                <button key={c} type="button" onClick={() => set('coloreSfondo', c)}
                  className="w-6 h-6 rounded border border-border"
                  style={{ backgroundColor: c, outline: form.coloreSfondo === c ? '2px solid #6B7280' : undefined, outlineOffset: 2 }}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input type="color" value={form.coloreSfondo} onChange={(e) => set('coloreSfondo', e.target.value)} className="w-8 h-8 rounded border border-border cursor-pointer flex-shrink-0" />
              <input type="text" value={form.coloreSfondo} onChange={(e) => set('coloreSfondo', e.target.value)} className="flex-1 border border-border rounded px-2 py-1.5 text-xs outline-none font-mono" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-xs text-gray-500">Colore testo</label>
            <input type="color" value={form.coloreTesto} onChange={(e) => set('coloreTesto', e.target.value)} className="w-8 h-8 rounded border border-border cursor-pointer" />
            <input type="text" value={form.coloreTesto} onChange={(e) => set('coloreTesto', e.target.value)} className="flex-1 border border-border rounded px-2 py-1.5 text-xs outline-none font-mono" />
          </div>

          {/* Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Data inizio</label>
              <input type="date" value={form.dataInizio ?? ''} onChange={(e) => set('dataInizio', e.target.value)}
                className="w-full border border-border rounded px-2 py-2 text-sm outline-none focus:ring-1 focus:ring-gray-900" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Scadenza (opz.)</label>
              <input type="date" value={form.dataScadenza ?? ''} onChange={(e) => set('dataScadenza', e.target.value || null)}
                className="w-full border border-border rounded px-2 py-2 text-sm outline-none focus:ring-1 focus:ring-gray-900" />
            </div>
          </div>

          {/* Link */}
          <div className="space-y-2">
            <label className="text-xs text-gray-500 block">Azione / Link (opz.)</label>
            <input type="url" value={form.linkUrl ?? ''} onChange={(e) => set('linkUrl', e.target.value || null)}
              placeholder="https://..." className="w-full border border-border rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-gray-900" />
            <input type="text" value={form.linkTesto ?? ''} onChange={(e) => set('linkTesto', e.target.value || null)}
              placeholder="Testo pulsante (es. Scopri di più)"
              className="w-full border border-border rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-gray-900" />
          </div>

          {/* Stato */}
          <label className="flex items-center justify-between cursor-pointer select-none">
            <span className="text-sm text-gray-700">Attiva subito</span>
            <button type="button" onClick={() => set('attiva', !form.attiva)}
              className={`relative w-10 h-5 rounded-full transition-colors ${form.attiva ? 'bg-gray-900' : 'bg-gray-300'}`}>
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.attiva ? 'translate-x-5' : ''}`} />
            </button>
          </label>

          {/* Preview */}
          <div>
            <p className="text-2xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Anteprima</p>
            <div className="rounded-lg p-4" style={{ backgroundColor: form.coloreSfondo, color: form.coloreTesto }}>
              <div className="flex items-start gap-2">
                {form.icona && <span className="text-xl">{form.icona}</span>}
                <div>
                  <p className="font-semibold text-sm">{form.titolo || 'Titolo notifica'}</p>
                  {form.testo && <p className="text-xs mt-0.5 opacity-90">{form.testo}</p>}
                  {form.linkUrl && (
                    <p className="text-xs mt-1 font-medium underline underline-offset-2">
                      {form.linkTesto || 'Scopri di più'}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-border flex justify-end gap-3 sticky bottom-0 bg-white">
          <button onClick={onClose} className="px-4 py-2 text-xs text-gray-600 hover:text-primary transition-colors">Annulla</button>
          <button onClick={handleSubmit} disabled={saving}
            className="px-4 py-2 bg-gray-900 text-white text-xs font-medium rounded hover:bg-gray-700 disabled:opacity-50 transition-colors">
            {saving ? 'Salvataggio…' : 'Salva'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminNotifichePage() {
  const qc = useQueryClient();
  const [modalData, setModalData] = useState<Partial<Notification> | null>(null);

  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ['admin-notifications'],
    queryFn: async () => {
      const res = await fetch('/api/admin/notifications');
      if (!res.ok) throw new Error();
      return res.json();
    },
  });

  async function handleSave(data: Omit<Notification, 'id' | 'createdAt' | '_count'>) {
    const isEdit = !!modalData?.id;
    const url = isEdit ? `/api/admin/notifications/${modalData!.id}` : '/api/admin/notifications';
    const method = isEdit ? 'PATCH' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) { toast.error('Errore nel salvataggio'); return; }
    toast.success(isEdit ? 'Notifica aggiornata' : 'Notifica creata');
    qc.invalidateQueries({ queryKey: ['admin-notifications'] });
  }

  async function toggleAttiva(n: Notification) {
    const res = await fetch(`/api/admin/notifications/${n.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attiva: !n.attiva }),
    });
    if (!res.ok) { toast.error('Errore'); return; }
    toast.success(n.attiva ? 'Notifica disattivata' : 'Notifica attivata');
    qc.invalidateQueries({ queryKey: ['admin-notifications'] });
  }

  async function handleDuplicate(n: Notification) {
    const { id: _id, createdAt: _c, _count: _cnt, ...rest } = n;
    const res = await fetch('/api/admin/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...rest, titolo: `${rest.titolo} (copia)`, attiva: false }),
    });
    if (!res.ok) { toast.error('Errore'); return; }
    toast.success('Notifica duplicata');
    qc.invalidateQueries({ queryKey: ['admin-notifications'] });
  }

  async function handleDelete(id: string) {
    if (!confirm('Eliminare questa notifica?')) return;
    const res = await fetch(`/api/admin/notifications/${id}`, { method: 'DELETE' });
    if (!res.ok) { toast.error('Errore'); return; }
    toast.success('Notifica eliminata');
    qc.invalidateQueries({ queryKey: ['admin-notifications'] });
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Bell size={18} className="text-primary" />
          <h1 className="text-lg font-semibold text-primary">Notifiche</h1>
        </div>
        <button
          onClick={() => setModalData({})}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-xs font-medium rounded hover:bg-gray-700 transition-colors"
        >
          <Plus size={14} />
          Nuova notifica
        </button>
      </div>

      {isLoading ? (
        <div className="text-sm text-gray-400 py-8">Caricamento…</div>
      ) : notifications.length === 0 ? (
        <div className="bg-white border border-border rounded-xl p-10 text-center">
          <Bell size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Nessuna notifica ancora</p>
          <button
            onClick={() => setModalData({})}
            className="mt-4 px-4 py-2 bg-gray-900 text-white text-xs font-medium rounded hover:bg-gray-700 transition-colors"
          >
            Crea la prima notifica
          </button>
        </div>
      ) : (
        <div className="bg-white border border-border rounded-xl overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 border-b border-border">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Notifica</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Tipo</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Scadenza</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Stato</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Letture</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500 uppercase tracking-wider">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {notifications.map((n) => {
                const status = getStatus(n);
                return (
                  <tr key={n.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-start gap-2">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-base"
                          style={{ backgroundColor: n.coloreSfondo, color: n.coloreTesto }}
                        >
                          {n.icona}
                        </div>
                        <div>
                          <p className="font-medium text-primary">{n.titolo}</p>
                          <p className="text-gray-400 line-clamp-1 mt-0.5">{n.testo}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{n.tipo}</td>
                    <td className="px-4 py-3 text-gray-500 hidden lg:table-cell">{formatDate(n.dataScadenza)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-medium ${status.color}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{n._count.reads}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setModalData(n)} title="Modifica"
                          className="p-1.5 text-gray-400 hover:text-primary transition-colors rounded">
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => toggleAttiva(n)} title={n.attiva ? 'Disattiva' : 'Attiva'}
                          className="p-1.5 text-gray-400 hover:text-primary transition-colors rounded">
                          {n.attiva ? <EyeOff size={13} /> : <Eye size={13} />}
                        </button>
                        <button onClick={() => handleDuplicate(n)} title="Duplica"
                          className="p-1.5 text-gray-400 hover:text-primary transition-colors rounded">
                          <Copy size={13} />
                        </button>
                        <button onClick={() => handleDelete(n.id)} title="Elimina"
                          className="p-1.5 text-gray-400 hover:text-red-500 transition-colors rounded">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {modalData !== null && (
        <Modal
          initial={modalData}
          onClose={() => setModalData(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
