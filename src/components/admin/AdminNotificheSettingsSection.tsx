'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, Send, Trash2, RefreshCw, Bell, Settings2, Plus, Mail, SmartphoneIcon } from 'lucide-react';
import toast from 'react-hot-toast';

// ─── Types ───────────────────────────────────────────────────────────────────

type RecentNotif = {
  id: string;
  titolo: string;
  testo: string;
  destinatari: string;
  createdAt: string;
  _count: { reads: number; customerReads: number };
};

type NotificheConfig = {
  id: string;
  nome: string;
  descrizione: string | null;
  attiva: boolean;
  canale: string;
  destinatari: string;
  evento: string;
  giorniAnticipo: number | null;
};

// ─── Constants ───────────────────────────────────────────────────────────────

const DESTINATARI_OPTIONS = [
  { value: 'tutti',      label: 'Tutti (operatori + clienti)' },
  { value: 'operatori',  label: 'Solo operatori' },
  { value: 'clienti',    label: 'Solo clienti' },
  { value: 'admin',      label: 'Solo amministratori' },
];

const EVENTI_OPTIONS = [
  { value: 'prenotazione_scadenza', label: 'Scadenza periodo prenotazione' },
  { value: 'catalogo_apertura',     label: 'Apertura nuovo catalogo' },
  { value: 'ordine_creato',         label: 'Nuovo ordine creato' },
  { value: 'ordine_esportato',      label: 'Ordine esportato in Demetra' },
  { value: 'cliente_inattivo',      label: 'Cliente inattivo' },
];

const CANALE_OPTIONS = [
  { value: 'push',     label: 'Push', icon: '🔔' },
  { value: 'email',    label: 'Email', icon: '📧' },
  { value: 'entrambi', label: 'Push + Email', icon: '📧🔔' },
];

const EVENTI_LABELS: Record<string, string> = Object.fromEntries(EVENTI_OPTIONS.map(e => [e.value, e.label]));
const DESTINATARI_LABELS: Record<string, string> = Object.fromEntries(DESTINATARI_OPTIONS.map(d => [d.value, d.label]));

const inp = 'w-full border border-border rounded px-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-gray-900';
const sel = inp + ' bg-white';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function startsWithEmoji(s: string) {
  return /^\p{Emoji}/u.test(s);
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function CanaleBadge({ canale }: { canale: string }) {
  const icon = canale === 'push' ? <SmartphoneIcon size={10} /> : canale === 'email' ? <Mail size={10} /> : <><Mail size={10} /><SmartphoneIcon size={10} /></>;
  return (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-2xs bg-gray-100 text-gray-600 font-medium">
      {icon}
    </span>
  );
}

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative w-8 h-4 rounded-full transition-colors flex-shrink-0 ${checked ? 'bg-gray-900' : 'bg-gray-300'} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : ''}`} />
    </button>
  );
}

// ─── Card wrapper ─────────────────────────────────────────────────────────────

function CollapsibleCard({ title, subtitle, icon, children }: {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  function toggle() {
    if (!open && !loaded) setLoaded(true);
    setOpen(o => !o);
  }

  return (
    <div className="bg-white border border-border rounded-xl overflow-hidden">
      <button
        onClick={toggle}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50/60 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="text-gray-500">{icon}</div>
          <div>
            <p className="text-sm font-semibold text-primary">{title}</p>
            {subtitle && <p className="text-2xs text-gray-400 mt-0.5">{subtitle}</p>}
          </div>
        </div>
        <ChevronDown size={14} className={`text-gray-400 transition-transform duration-200 flex-shrink-0 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="border-t border-border px-5 py-5">
          {loaded && children}
        </div>
      )}
    </div>
  );
}

// ─── Card 1: Invia notifica manuale ──────────────────────────────────────────

function CardInviaNotifica() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ destinatari: 'tutti', titolo: '', testo: '' });
  const [sending, setSending] = useState(false);

  const { data: recenti = [], isLoading } = useQuery<RecentNotif[]>({
    queryKey: ['admin-notifiche-recenti'],
    queryFn: async () => {
      const res = await fetch('/api/admin/notifications?limit=10');
      if (!res.ok) throw new Error();
      const all = await res.json() as RecentNotif[];
      return all.slice(0, 10);
    },
  });

  async function handleSend() {
    if (!form.titolo.trim()) { toast.error('Titolo obbligatorio'); return; }
    setSending(true);
    try {
      const res = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titolo: form.titolo.toUpperCase(),
          testo: form.testo,
          icona: '📢',
          tipo: 'Informazione',
          coloreSfondo: '#000000',
          coloreTesto: '#FFFFFF',
          destinatari: form.destinatari,
          attiva: true,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success('Notifica inviata');
      setForm({ destinatari: 'tutti', titolo: '', testo: '' });
      qc.invalidateQueries({ queryKey: ['admin-notifiche-recenti'] });
    } catch {
      toast.error('Errore nell\'invio');
    } finally {
      setSending(false);
    }
  }

  async function handleResend(id: string) {
    const res = await fetch(`/api/admin/notifications/${id}/send`, { method: 'POST' });
    if (!res.ok) { toast.error('Errore nel reinvio'); return; }
    toast.success('Notifica reinviata');
  }

  async function handleDelete(id: string) {
    if (!confirm('Eliminare questa notifica?')) return;
    const res = await fetch(`/api/admin/notifications/${id}`, { method: 'DELETE' });
    if (!res.ok) { toast.error('Errore'); return; }
    toast.success('Notifica eliminata');
    qc.invalidateQueries({ queryKey: ['admin-notifiche-recenti'] });
  }

  return (
    <div className="space-y-5">
      {/* Form */}
      <div className="space-y-3">
        <div>
          <label className="text-2xs text-gray-500 mb-1 block font-medium">Destinatari</label>
          <select value={form.destinatari} onChange={e => setForm(f => ({ ...f, destinatari: e.target.value }))} className={sel}>
            {DESTINATARI_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-2xs text-gray-500 mb-1 block font-medium">Titolo</label>
          <input
            value={form.titolo}
            onChange={e => setForm(f => ({ ...f, titolo: e.target.value }))}
            onBlur={e => setForm(f => ({ ...f, titolo: e.target.value.toUpperCase() }))}
            placeholder="TITOLO NOTIFICA"
            className={inp + ' uppercase font-medium tracking-wide'}
          />
        </div>
        <div>
          <label className="text-2xs text-gray-500 mb-1 block font-medium">Messaggio <span className="text-gray-400 font-normal">(opzionale)</span></label>
          <textarea
            value={form.testo}
            onChange={e => setForm(f => ({ ...f, testo: e.target.value.slice(0, 300) }))}
            rows={3}
            placeholder="Testo aggiuntivo per i destinatari…"
            className={inp + ' resize-none'}
          />
          <p className="text-2xs text-gray-400 text-right">{form.testo.length}/300</p>
        </div>
        <button
          onClick={handleSend}
          disabled={sending}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-xs font-medium rounded hover:bg-gray-700 disabled:opacity-50 transition-colors"
        >
          <Send size={12} />
          {sending ? 'Invio in corso…' : 'Invia notifica'}
        </button>
      </div>

      {/* Ultime 10 */}
      <div>
        <p className="text-2xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Ultime notifiche inviate</p>
        {isLoading ? (
          <p className="text-xs text-gray-400">Caricamento…</p>
        ) : recenti.length === 0 ? (
          <p className="text-xs text-gray-400">Nessuna notifica ancora.</p>
        ) : (
          <div className="divide-y divide-border border border-border rounded-lg overflow-hidden">
            {recenti.map(n => {
              const isAuto = startsWithEmoji(n.titolo);
              return (
                <div key={n.id} className="flex items-start gap-3 px-4 py-3 bg-white hover:bg-gray-50/50">
                  {/* Badge tipo */}
                  <div className="flex-shrink-0 mt-0.5">
                    {isAuto ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-medium" style={{ background: '#fffbeb', color: '#92400e' }}>
                        ↙ Richiesta operatore
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-medium" style={{ background: '#eff6ff', color: '#1d4ed8' }}>
                        ↗ Inviata
                      </span>
                    )}
                  </div>
                  {/* Contenuto */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-primary uppercase tracking-wide truncate">{n.titolo}</p>
                    {n.testo && <p className="text-2xs text-gray-500 line-clamp-1 mt-0.5">{n.testo}</p>}
                    <div className="flex items-center gap-3 mt-1 text-2xs text-gray-400">
                      <span>{DESTINATARI_LABELS[n.destinatari] ?? n.destinatari}</span>
                      <span>·</span>
                      <span>{formatDate(n.createdAt)}</span>
                      <span>·</span>
                      <span>{(n._count.reads ?? 0) + (n._count.customerReads ?? 0)} letture</span>
                    </div>
                  </div>
                  {/* Azioni */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {!isAuto && (
                      <button onClick={() => handleResend(n.id)} title="Reinvia" className="p-1.5 text-gray-400 hover:text-blue-600 rounded transition-colors">
                        <RefreshCw size={12} />
                      </button>
                    )}
                    <button onClick={() => handleDelete(n.id)} title="Elimina" className="p-1.5 text-gray-400 hover:text-red-500 rounded transition-colors">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Card 2: Regole notifiche automatiche ────────────────────────────────────

const EMPTY_RULE = { nome: '', descrizione: '', evento: 'prenotazione_scadenza', canale: 'push', destinatari: 'tutti', giorniAnticipo: '' };

function CardRegoleNotifiche() {
  const qc = useQueryClient();
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newRule, setNewRule] = useState(EMPTY_RULE);
  const [saving, setSaving] = useState(false);

  const { data: rules = [], isLoading } = useQuery<NotificheConfig[]>({
    queryKey: ['admin-notifiche-config'],
    queryFn: () => fetch('/api/admin/notifiche-config').then(r => r.json()),
  });

  async function handleToggle(rule: NotificheConfig) {
    setTogglingId(rule.id);
    try {
      const res = await fetch(`/api/admin/notifiche-config/${rule.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attiva: !rule.attiva }),
      });
      if (!res.ok) throw new Error();
      toast.success(rule.attiva ? 'Regola disattivata' : 'Regola attivata');
      qc.invalidateQueries({ queryKey: ['admin-notifiche-config'] });
    } catch {
      toast.error('Errore nell\'aggiornamento');
    } finally {
      setTogglingId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Eliminare questa regola?')) return;
    const res = await fetch(`/api/admin/notifiche-config/${id}`, { method: 'DELETE' });
    if (!res.ok) { toast.error('Errore'); return; }
    toast.success('Regola eliminata');
    qc.invalidateQueries({ queryKey: ['admin-notifiche-config'] });
  }

  async function handleSaveRule() {
    if (!newRule.nome.trim()) { toast.error('Nome obbligatorio'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/admin/notifiche-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newRule,
          giorniAnticipo: newRule.giorniAnticipo ? Number(newRule.giorniAnticipo) : null,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success('Regola aggiunta');
      setNewRule(EMPTY_RULE);
      setAddOpen(false);
      qc.invalidateQueries({ queryKey: ['admin-notifiche-config'] });
    } catch {
      toast.error('Errore nel salvataggio');
    } finally {
      setSaving(false);
    }
  }

  // Raggruppa per evento
  const byEvento = rules.reduce<Record<string, NotificheConfig[]>>((acc, r) => {
    (acc[r.evento] ??= []).push(r);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {isLoading ? (
        <p className="text-xs text-gray-400">Caricamento…</p>
      ) : rules.length === 0 ? (
        <p className="text-xs text-gray-400">Nessuna regola configurata.</p>
      ) : (
        Object.entries(byEvento).map(([evento, gruppo]) => (
          <div key={evento}>
            <p className="text-2xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
              {EVENTI_LABELS[evento] ?? evento}
            </p>
            <div className="border border-border rounded-lg overflow-hidden divide-y divide-border">
              {gruppo.map(rule => (
                <div key={rule.id} className={`flex items-center gap-3 px-4 py-3 bg-white hover:bg-gray-50/50 transition-colors ${!rule.attiva ? 'opacity-60' : ''}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-xs font-medium text-primary">{rule.nome}</p>
                      <CanaleBadge canale={rule.canale} />
                      {rule.giorniAnticipo != null && (
                        <span className="px-1.5 py-0.5 rounded text-2xs bg-amber-50 text-amber-700 font-medium border border-amber-200">
                          {rule.giorniAnticipo} gg prima
                        </span>
                      )}
                    </div>
                    {rule.descrizione && <p className="text-2xs text-gray-400 mt-0.5 line-clamp-1">{rule.descrizione}</p>}
                    <p className="text-2xs text-gray-400 mt-0.5">{DESTINATARI_LABELS[rule.destinatari] ?? rule.destinatari}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Toggle checked={rule.attiva} onChange={() => handleToggle(rule)} disabled={togglingId === rule.id} />
                    <button onClick={() => handleDelete(rule.id)} className="p-1.5 text-gray-300 hover:text-red-500 rounded transition-colors">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {/* Form aggiungi regola */}
      {addOpen ? (
        <div className="border border-dashed border-border rounded-lg p-4 space-y-3 bg-gray-50/50">
          <p className="text-2xs font-semibold uppercase tracking-wider text-gray-400">Nuova regola</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-2xs text-gray-500 mb-1 block">Nome *</label>
              <input value={newRule.nome} onChange={e => setNewRule(r => ({ ...r, nome: e.target.value }))} placeholder="Es. Promemoria scadenza" className={inp} />
            </div>
            <div>
              <label className="text-2xs text-gray-500 mb-1 block">Evento *</label>
              <select value={newRule.evento} onChange={e => setNewRule(r => ({ ...r, evento: e.target.value }))} className={sel}>
                {EVENTI_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-2xs text-gray-500 mb-1 block">Canale *</label>
              <select value={newRule.canale} onChange={e => setNewRule(r => ({ ...r, canale: e.target.value }))} className={sel}>
                {CANALE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.icon} {o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-2xs text-gray-500 mb-1 block">Destinatari *</label>
              <select value={newRule.destinatari} onChange={e => setNewRule(r => ({ ...r, destinatari: e.target.value }))} className={sel}>
                {DESTINATARI_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-2xs text-gray-500 mb-1 block">Giorni anticipo <span className="text-gray-400">(opz.)</span></label>
              <input type="number" min={0} value={newRule.giorniAnticipo} onChange={e => setNewRule(r => ({ ...r, giorniAnticipo: e.target.value }))} placeholder="Es. 7" className={inp} />
            </div>
            <div>
              <label className="text-2xs text-gray-500 mb-1 block">Descrizione <span className="text-gray-400">(opz.)</span></label>
              <input value={newRule.descrizione} onChange={e => setNewRule(r => ({ ...r, descrizione: e.target.value }))} placeholder="Breve descrizione…" className={inp} />
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <button onClick={handleSaveRule} disabled={saving} className="px-3 py-1.5 bg-gray-900 text-white text-xs rounded hover:bg-gray-700 disabled:opacity-50 transition-colors">
              {saving ? 'Salvataggio…' : 'Salva regola'}
            </button>
            <button onClick={() => { setAddOpen(false); setNewRule(EMPTY_RULE); }} className="px-3 py-1.5 text-xs text-gray-500 hover:text-primary transition-colors">
              Annulla
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-primary transition-colors py-1"
        >
          <Plus size={13} />
          Aggiungi regola
        </button>
      )}
    </div>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────

export default function AdminNotificheSettingsSection() {
  return (
    <section className="space-y-3">
      <div className="mb-1">
        <h2 className="text-sm font-semibold text-primary">Notifiche</h2>
        <p className="text-2xs text-gray-400 mt-0.5">Invio manuale e regole di notifica automatica</p>
      </div>
      <CollapsibleCard
        title="Invia notifica manuale"
        subtitle="Scrivi e invia una notifica ai destinatari selezionati"
        icon={<Bell size={15} />}
      >
        <CardInviaNotifica />
      </CollapsibleCard>
      <CollapsibleCard
        title="Regole notifiche automatiche"
        subtitle="Configura quando e come vengono inviate le notifiche automatiche"
        icon={<Settings2 size={15} />}
      >
        <CardRegoleNotifiche />
      </CollapsibleCard>
    </section>
  );
}
