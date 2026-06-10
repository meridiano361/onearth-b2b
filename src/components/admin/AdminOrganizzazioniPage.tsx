'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus, ChevronDown, ChevronRight, Edit2, Trash2,
  ToggleLeft, ToggleRight, KeyRound, Store, Globe, Radio, Package,
  Users, MapPin, Copy, CheckSquare, Square, Loader2, Send,
  ShoppingBag, Building, ShoppingCart, Tag, Landmark, X, Layers, Search,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import toast from 'react-hot-toast';
import type { Organization, Operator, Destinazione, DestinazioneTipo } from '@/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TIPO_LABELS: Record<DestinazioneTipo, string> = {
  BOTTEGA: 'Bottega', EMPORIO: 'Emporio', DISTRETTO: 'Distretto',
  STORE: 'Store', OUTLET: 'Outlet', TENDONE: 'Tendone',
  FIERA: 'Fiera', ONLINE: 'Online', ALTRO: 'Altro',
};

const TIPO_ICONS: Record<DestinazioneTipo, React.ReactNode> = {
  BOTTEGA: <Store size={12} />, EMPORIO: <ShoppingBag size={12} />,
  DISTRETTO: <Building size={12} />, STORE: <ShoppingCart size={12} />,
  OUTLET: <Tag size={12} />, TENDONE: <Radio size={12} />,
  FIERA: <Landmark size={12} />, ONLINE: <Globe size={12} />,
  ALTRO: <Package size={12} />,
};

function generateDefaultPassword(orgNome: string): string {
  const slug = orgNome.toLowerCase().normalize('NFD')
    .replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, '');
  return 'onearth_' + slug.substring(0, 5);
}

function capitalize(v: string): string {
  const s = v.trim();
  return s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : '';
}

// ─── CreateOrgModal ───────────────────────────────────────────────────────────

function CreateOrgModal({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  const [nome, setNome] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    const n = capitalize(nome);
    if (!n) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: n }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Errore'); }
      toast.success('Organizzazione creata');
      onSave();
    } catch (e: any) {
      toast.error(e.message || 'Operazione fallita');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal isOpen onClose={onClose} title="Nuova organizzazione" size="sm">
      <div className="space-y-4">
        <Input
          label="Nome organizzazione *"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          onBlur={() => setNome(capitalize(nome))}
          placeholder="Bottega del mondo"
          autoFocus
        />
        <div className="flex justify-end gap-3 pt-1">
          <Button variant="ghost" onClick={onClose}>Annulla</Button>
          <Button onClick={handleSave} loading={saving} disabled={!nome.trim()}>
            Crea organizzazione
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── EditOrgModal ─────────────────────────────────────────────────────────────

function EditOrgModal({ org, onClose, onSave }: { org: Organization; onClose: () => void; onSave: () => void }) {
  const [nome, setNome] = useState(org.nome);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!nome.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/organizations/${org.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: nome.trim() }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Errore'); }
      toast.success('Organizzazione aggiornata');
      onSave();
    } catch (e: any) {
      toast.error(e.message || 'Operazione fallita');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal isOpen onClose={onClose} title="Modifica organizzazione" size="sm">
      <div className="space-y-4">
        <Input label="Nome organizzazione *" value={nome} onChange={(e) => setNome(e.target.value)} />
        <div className="flex justify-end gap-3 pt-1">
          <Button variant="ghost" onClick={onClose}>Annulla</Button>
          <Button onClick={handleSave} loading={saving}>Salva modifiche</Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── OperatorModal ────────────────────────────────────────────────────────────

const RUOLI = [
  'Responsabile acquisti', 'Responsabile bottega', 'Coordinatore',
  'Membro del CdA', 'Addetto vendite', 'Volontario', 'Altro',
];

interface OperatorFormData {
  nome: string; cognome: string; email: string; telefono: string;
  ruolo: string; password: string; attivo: boolean;
  inviaMail: boolean; noteCliente: string;
}

function OperatorModal({
  isOpen, onClose, onSave, operator, orgId, orgNome,
}: {
  isOpen: boolean; onClose: () => void; onSave: () => void;
  operator?: Operator; orgId: string; orgNome: string;
}) {
  const isEdit = !!operator;
  const defaultPwd = generateDefaultPassword(orgNome);
  const [form, setForm] = useState<OperatorFormData>({
    nome: operator?.nome || '', cognome: operator?.cognome || '',
    email: operator?.email || '', telefono: operator?.telefono || '',
    ruolo: operator?.ruolo || '',
    password: isEdit ? '' : defaultPwd, attivo: operator?.attivo ?? true,
    inviaMail: false, noteCliente: '',
  });
  const [saving, setSaving] = useState(false);

  const set = (k: keyof OperatorFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: (e.target as HTMLInputElement).type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value }));

  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((f) => ({ ...f, telefono: e.target.value.replace(/\s/g, '') }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      if (isEdit) {
        const body: any = {
          nome: form.nome, cognome: form.cognome, email: form.email,
          telefono: form.telefono || null, ruolo: form.ruolo || null, attivo: form.attivo,
        };
        if (form.password) body.newPassword = form.password;
        const res = await fetch(`/api/operatori/${operator!.id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
        });
        if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Errore'); }
        toast.success('Operatore aggiornato');
      } else {
        const res = await fetch(`/api/admin/organizations/${orgId}/operators`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nome: form.nome, cognome: form.cognome, email: form.email,
            telefono: form.telefono || null, ruolo: form.ruolo || null,
            password: form.password, attivo: form.attivo,
            inviaMail: form.inviaMail, noteCliente: form.noteCliente || null,
          }),
        });
        if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Errore'); }
        const json = await res.json();
        if (json.data?.mailInviata) {
          toast.success(`Operatore creato. Email con credenziali inviata a ${form.email}`);
        } else if (form.inviaMail) {
          const errDetail = json.data?.mailError ? `: ${json.data.mailError}` : '';
          toast(`Operatore creato. Email non inviata${errDetail}`, { icon: '⚠️', duration: 8000 });
        } else {
          toast.success(`Operatore creato. Password: ${form.password}`);
        }
      }
      onSave();
    } catch (e: any) {
      toast.error(e.message || 'Operazione fallita');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Modifica Operatore' : 'Nuovo Operatore'} size="md">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Input label="Nome *" value={form.nome} onChange={set('nome')}
            onBlur={() => setForm((f) => ({ ...f, nome: capitalize(f.nome) }))}
            placeholder="Maria" />
          <Input label="Cognome *" value={form.cognome} onChange={set('cognome')}
            onBlur={() => setForm((f) => ({ ...f, cognome: capitalize(f.cognome) }))}
            placeholder="Rossi" />
        </div>
        <Input label="Email *" type="email" value={form.email} onChange={set('email')} placeholder="m.rossi@org.it" />
        <Input label="Telefono" value={form.telefono} onChange={handlePhoneChange} placeholder="+393331234567" />
        <div>
          <label className="block text-xs font-medium tracking-wide uppercase text-gray-600 mb-2">Ruolo</label>
          <select value={form.ruolo} onChange={set('ruolo')}
            className="w-full px-4 py-2.5 bg-white border border-border rounded text-sm focus:outline-none focus:border-accent">
            <option value="">— Seleziona ruolo —</option>
            {RUOLI.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium tracking-wide uppercase text-gray-600 mb-2">
            {isEdit ? 'Nuova Password (vuoto = invariata)' : 'Password *'}
          </label>
          <Input value={form.password} onChange={set('password')} type="text"
            placeholder={isEdit ? '••••••••' : defaultPwd} />
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" id="op-attivo" checked={form.attivo}
            onChange={(e) => setForm((f) => ({ ...f, attivo: e.target.checked }))}
            className="w-4 h-4 accent-accent" />
          <label htmlFor="op-attivo" className="text-sm text-primary">Attivo (può accedere)</label>
        </div>
        {!isEdit && (
          <>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="op-inviamail" checked={form.inviaMail}
                onChange={(e) => setForm((f) => ({ ...f, inviaMail: e.target.checked }))}
                className="w-4 h-4 accent-accent" />
              <label htmlFor="op-inviamail" className="text-sm text-primary">Invia email con credenziali</label>
            </div>
            {form.inviaMail && (
              <div>
                <label className="block text-xs font-medium tracking-wide uppercase text-gray-600 mb-2">Nota per il cliente (opzionale)</label>
                <textarea
                  value={form.noteCliente}
                  onChange={(e) => setForm((f) => ({ ...f, noteCliente: e.target.value }))}
                  placeholder="Es. Benvenuto! Da oggi puoi consultare il catalogo ON EARTH..."
                  rows={3}
                  className="w-full px-4 py-2.5 bg-white border border-border rounded text-sm text-primary placeholder-gray-400 focus:outline-none focus:border-accent resize-none"
                />
              </div>
            )}
          </>
        )}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={onClose}>Annulla</Button>
          <Button onClick={handleSave} loading={saving}>{isEdit ? 'Salva' : 'Crea operatore'}</Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── DestinazioneModal ────────────────────────────────────────────────────────

function DestinazioneModal({ isOpen, onClose, onSave, destinazione, orgId }: {
  isOpen: boolean; onClose: () => void; onSave: () => void;
  destinazione?: Destinazione; orgId: string;
}) {
  const isEdit = !!destinazione;
  const [tipo, setTipo] = useState<DestinazioneTipo>(destinazione?.tipo || 'BOTTEGA');
  const [citta, setCitta] = useState(destinazione?.citta || '');
  const [indirizzo, setIndirizzo] = useState(destinazione?.indirizzo || '');
  const [budget, setBudget] = useState(destinazione?.budget != null ? String(destinazione.budget) : '');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const url = isEdit ? `/api/destinazioni/${destinazione!.id}` : `/api/organizations/${orgId}/destinazioni`;
      const method = isEdit ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo, citta: citta.trim() || null,
          indirizzo: indirizzo.trim() || null,
          budget: budget.trim() ? parseFloat(budget) : null,
        }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Errore'); }
      toast.success(isEdit ? 'Destinazione aggiornata' : 'Destinazione creata');
      onSave();
    } catch (e: any) {
      toast.error(e.message || 'Operazione fallita');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Modifica Destinazione' : 'Nuova Destinazione'} size="sm">
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium tracking-wide uppercase text-gray-600 mb-2">Tipo *</label>
          <select value={tipo} onChange={(e) => setTipo(e.target.value as DestinazioneTipo)}
            className="w-full px-4 py-2.5 bg-white border border-border rounded text-sm focus:outline-none focus:border-accent">
            {(Object.keys(TIPO_LABELS) as DestinazioneTipo[]).map((t) => (
              <option key={t} value={t}>{TIPO_LABELS[t]}</option>
            ))}
          </select>
        </div>
        <Input label="Città" value={citta} onChange={(e) => setCitta(e.target.value)} placeholder="Milano" />
        <Input label="Indirizzo" value={indirizzo} onChange={(e) => setIndirizzo(e.target.value)} placeholder="Via Roma 10" />
        <div>
          <label className="block text-xs font-medium tracking-wide uppercase text-gray-600 mb-2">Budget acquisto €</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">€</span>
            <input
              type="number" min="0" step="100"
              value={budget} onChange={(e) => setBudget(e.target.value)}
              placeholder="es. 5000"
              className="w-full pl-7 pr-4 py-2.5 bg-white border border-border rounded text-sm text-primary placeholder-gray-400 focus:outline-none focus:border-accent"
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={onClose}>Annulla</Button>
          <Button onClick={handleSave} loading={saving}>{isEdit ? 'Salva' : 'Crea'}</Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── BulkResetModal ───────────────────────────────────────────────────────────

function BulkResetModal({
  results,
  onClose,
}: {
  results: { name: string; email: string; password: string }[];
  onClose: () => void;
}) {
  return (
    <Modal isOpen onClose={onClose} title="Password resettate" size="md"
      footer={<Button onClick={onClose}>Ho preso nota, chiudi</Button>}>
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Password resettate per <span className="font-semibold text-primary">{results.length} operatori</span>.
        </p>
        <div className="bg-cream border border-border rounded divide-y divide-border max-h-72 overflow-y-auto">
          {results.map((r) => (
            <div key={r.email} className="flex items-center justify-between px-4 py-2.5 gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium text-primary truncate">{r.name}</p>
                <p className="text-2xs text-gray-400 truncate">{r.email}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="font-mono text-sm font-bold text-primary">{r.password}</span>
                <button onClick={() => { navigator.clipboard.writeText(r.password); toast.success('Copiata'); }}
                  className="text-gray-400 hover:text-primary transition-colors">
                  <Copy size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
          Comunica le password ai rispettivi operatori. Non verranno mostrate di nuovo.
        </p>
      </div>
    </Modal>
  );
}

// ─── OrgOperatorsBulkBar ──────────────────────────────────────────────────────

interface BulkBarProps {
  count: number;
  operatorIds: string[];
  orgId: string;
  onDeselect: () => void;
  onDone: (results?: { name: string; email: string; password: string }[]) => void;
}

function OrgOperatorsBulkBar({ count, operatorIds, onDeselect, onDone }: BulkBarProps) {
  const [loading, setLoading] = useState(false);

  async function runBulk(action: 'activate' | 'deactivate' | 'resetPassword') {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/operators/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operatorIds, action }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Errore'); }
      const json = await res.json();
      if (action === 'activate') toast.success(`${count} operator${count !== 1 ? 'i' : 'e'} attivati`);
      else if (action === 'deactivate') toast.success(`${count} operator${count !== 1 ? 'i' : 'e'} disattivati`);
      onDone(action === 'resetPassword' ? json.results : undefined);
    } catch (e: any) {
      toast.error(e.message || 'Errore durante l\'operazione');
      setLoading(false);
    }
  }

  async function runBulkFeature(enable: boolean) {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/operators/bulk-features', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: operatorIds, featureMondiEspositivi: enable }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Errore'); }
      const json = await res.json();
      toast.success(`Esposizione ${enable ? 'abilitata' : 'disabilitata'} per ${json.updated} operatori`);
      onDone();
    } catch (e: any) {
      toast.error(e.message || 'Errore durante l\'operazione');
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Eliminare definitivamente ${count} operatore${count !== 1 ? 'i' : ''}? Questa azione non può essere annullata.`)) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/operators/bulk', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operatorIds }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Errore'); }
      toast.success(`${count} operatore${count !== 1 ? 'i' : 'e'} eliminati`);
      onDone();
    } catch (e: any) {
      toast.error(e.message || 'Errore durante l\'eliminazione');
      setLoading(false);
    }
  }

  return (
    <div className="animate-slide-up mb-3 bg-primary text-white rounded-lg px-3 py-2.5 flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold flex-shrink-0">
        {count} operator{count !== 1 ? 'i' : 'e'} selezionat{count !== 1 ? 'i' : 'o'}
      </span>

      <div className="flex flex-wrap items-center gap-1.5 flex-1">
        <button
          onClick={() => runBulk('activate')}
          disabled={loading}
          className="text-2xs px-2.5 py-1 bg-white/20 hover:bg-white/30 rounded transition-colors disabled:opacity-50"
        >
          Attiva
        </button>
        <button
          onClick={() => runBulk('deactivate')}
          disabled={loading}
          className="text-2xs px-2.5 py-1 bg-white/20 hover:bg-white/30 rounded transition-colors disabled:opacity-50"
        >
          Disattiva
        </button>
        <button
          onClick={() => runBulk('resetPassword')}
          disabled={loading}
          className="text-2xs px-2.5 py-1 bg-white/20 hover:bg-white/30 rounded transition-colors disabled:opacity-50"
        >
          Reset password
        </button>
        <button
          onClick={() => runBulkFeature(true)}
          disabled={loading}
          className="text-2xs px-2.5 py-1 bg-white/20 hover:bg-white/30 rounded transition-colors disabled:opacity-50 flex items-center gap-1"
        >
          <Layers size={10} />Abilita Esposizione
        </button>
        <button
          onClick={() => runBulkFeature(false)}
          disabled={loading}
          className="text-2xs px-2.5 py-1 bg-[#C17A5A]/70 hover:bg-[#C17A5A] rounded transition-colors disabled:opacity-50 flex items-center gap-1"
        >
          <Layers size={10} />Disabilita Esposizione
        </button>
        <button
          onClick={handleDelete}
          disabled={loading}
          className="text-2xs px-2.5 py-1 bg-red-500/70 hover:bg-red-500 rounded transition-colors disabled:opacity-50"
        >
          Elimina
        </button>
        {loading && <Loader2 size={13} className="animate-spin opacity-70" />}
      </div>

      <button
        onClick={onDeselect}
        disabled={loading}
        className="text-2xs opacity-70 hover:opacity-100 transition-opacity flex items-center gap-1 flex-shrink-0"
      >
        <X size={12} />
        Deseleziona
      </button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminOrganizzazioniPage() {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [orgSearchText, setOrgSearchText] = useState('');
  const [showNewOrg, setShowNewOrg] = useState(false);
  const [opModal, setOpModal] = useState<{ orgId: string; orgNome: string; operator?: Operator } | null>(null);
  const [destinazioneModal, setDestinazioneModal] = useState<{ orgId: string; destinazione?: Destinazione } | null>(null);
  const [editOrgModal, setEditOrgModal] = useState<Organization | null>(null);
  const [resetResult, setResetResult] = useState<{ name: string; password: string } | null>(null);
  const [bulkResetResults, setBulkResetResults] = useState<{ name: string; email: string; password: string }[] | null>(null);
  const [sendingCreds, setSendingCreds] = useState<string | null>(null);

  // Global operator selection (across all orgs)
  const [selectedOpIds, setSelectedOpIds] = useState<Set<string>>(new Set());

  // Org-level selection for org-bulk actions
  const [selectedOrgIds, setSelectedOrgIds] = useState<Set<string>>(new Set());
  const [orgBulkLoading, setOrgBulkLoading] = useState(false);
  const [orgBulkResetResults, setOrgBulkResetResults] = useState<{ name: string; password: string }[] | null>(null);

  // Global Mondi Espositivi bulk
  const [mondiConfirm, setMondiConfirm] = useState<'enable' | 'disable' | null>(null);
  const [mondiLoading, setMondiLoading] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-organizations'],
    queryFn: async () => {
      const res = await fetch('/api/organizations');
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  const allOrgs: Organization[] = data?.data || [];
  const orgs: Organization[] = orgSearchText.trim()
    ? allOrgs.filter((o) => o.nome.toLowerCase().includes(orgSearchText.toLowerCase()))
    : allOrgs;
  const totalOrgs = allOrgs.length;
  const totalOps = allOrgs.reduce((s, o) => s + (o.operatori?.length || 0), 0);

  const allOrgsSelected = orgs.length > 0 && orgs.every((o) => selectedOrgIds.has(o.id));
  const selectedOrgCount = selectedOrgIds.size;

  function refresh() { queryClient.invalidateQueries({ queryKey: ['admin-organizations'] }); }

  function toggleExpand(id: string) {
    setExpanded((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  function toggleOpSelect(id: string) {
    setSelectedOpIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  function toggleSelectAllInOrg(ops: Operator[]) {
    const ids = ops.map((o) => o.id);
    const allSelected = ids.every((id) => selectedOpIds.has(id));
    setSelectedOpIds((prev) => {
      const n = new Set(prev);
      if (allSelected) ids.forEach((id) => n.delete(id));
      else ids.forEach((id) => n.add(id));
      return n;
    });
  }

  function clearOrgOps(ops: Operator[]) {
    const ids = new Set(ops.map((o) => o.id));
    setSelectedOpIds((prev) => {
      const n = new Set(prev);
      ids.forEach((id) => n.delete(id));
      return n;
    });
  }

  function toggleOrgSelect(id: string) {
    setSelectedOrgIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  function toggleSelectAllOrgs() {
    if (allOrgsSelected) setSelectedOrgIds(new Set());
    else setSelectedOrgIds(new Set(orgs.map((o) => o.id)));
  }

  // ── Single-operator actions ───────────────────────────────────────────────

  async function handleToggleOperator(op: Operator) {
    try {
      const res = await fetch(`/api/operatori/${op.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attivo: !op.attivo }),
      });
      if (!res.ok) throw new Error('Failed');
      refresh();
      toast.success(`Operatore ${op.attivo ? 'disattivato' : 'attivato'}`);
    } catch { toast.error('Errore'); }
  }

  async function handleToggleMondiEspositivi(op: Operator) {
    try {
      const res = await fetch(`/api/admin/operators/${op.id}/features`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featureMondiEspositivi: !op.featureMondiEspositivi }),
      });
      if (!res.ok) throw new Error('Failed');
      refresh();
      toast.success(op.featureMondiEspositivi ? 'Esposizione disabilitata' : 'Esposizione abilitata');
    } catch { toast.error('Errore'); }
  }

  async function handleDeleteOperator(op: Operator) {
    if (!confirm(`Eliminare ${op.nome} ${op.cognome}?`)) return;
    try {
      const res = await fetch(`/api/operatori/${op.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error || 'Errore');
      setSelectedOpIds((prev) => { const n = new Set(prev); n.delete(op.id); return n; });
      refresh();
      toast.success('Operatore eliminato');
    } catch (e: any) { toast.error(e.message || 'Errore'); }
  }

  function handleResetPassword(op: Operator, orgNome: string) {
    const password = generateDefaultPassword(orgNome);
    fetch(`/api/operatori/${op.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPassword: password }),
    })
      .then(() => { setResetResult({ name: `${op.nome} ${op.cognome}`, password }); refresh(); })
      .catch(() => toast.error('Errore nel reset password'));
  }

  async function handleSendCredentials(op: Operator) {
    const password = window.prompt(
      `Password da inviare a ${op.nome} ${op.cognome} (${op.email}):\n\nScrivi la password attuale — il DB non verrà modificato.`
    );
    if (password === null || password.trim() === '') return;
    setSendingCreds(op.id);
    try {
      const res = await fetch(`/api/admin/operators/${op.id}/send-credentials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: password.trim() }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Errore');
      if (body.sent) {
        toast.success(`Credenziali inviate a ${body.email}`);
      } else {
        toast(`Email non inviata: ${body.error || 'errore sconosciuto'}`, { icon: '⚠️', duration: 8000 });
      }
    } catch (e: any) {
      toast.error(e.message || "Errore nell'invio");
    } finally {
      setSendingCreds(null);
    }
  }

  async function handleDeleteDestinazione(destinazione: Destinazione) {
    if (!confirm(`Eliminare la destinazione "${destinazione.nome}"?`)) return;
    try {
      const res = await fetch(`/api/destinazioni/${destinazione.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error || 'Errore');
      refresh();
      toast.success('Destinazione eliminata');
    } catch (e: any) { toast.error(e.message || 'Errore'); }
  }

  // ── Global Mondi Espositivi bulk ─────────────────────────────────────────

  async function handleGlobalMondi(enable: boolean) {
    setMondiLoading(true);
    try {
      const res = await fetch('/api/admin/operators/bulk-features', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: 'ALL', featureMondiEspositivi: enable }),
      });
      if (!res.ok) throw new Error('Errore');
      const json = await res.json();
      toast.success(`Esposizione ${enable ? 'abilitata' : 'disabilitata'} per ${json.updated} operatori`);
      setMondiConfirm(null);
      refresh();
    } catch {
      toast.error('Errore durante l\'operazione');
    } finally {
      setMondiLoading(false);
    }
  }

  // ── Org bulk actions ──────────────────────────────────────────────────────

  async function handleOrgBulkSetActive(attivo: boolean) {
    if (!selectedOrgCount) return;
    setOrgBulkLoading(true);
    try {
      const opIds = orgs
        .filter((o) => selectedOrgIds.has(o.id))
        .flatMap((o) => o.operatori || [])
        .map((op) => op.id);
      if (opIds.length > 0) {
        const res = await fetch('/api/admin/operators/bulk', {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ operatorIds: opIds, action: attivo ? 'activate' : 'deactivate' }),
        });
        if (!res.ok) throw new Error('Errore');
      }
      toast.success(`Operatori di ${selectedOrgCount} organizzazion${selectedOrgCount !== 1 ? 'i' : 'e'} ${attivo ? 'attivati' : 'disattivati'}`);
      refresh();
    } catch { toast.error('Errore durante l\'operazione'); }
    finally { setOrgBulkLoading(false); }
  }

  async function handleOrgBulkResetPassword() {
    if (!selectedOrgCount) return;
    setOrgBulkLoading(true);
    try {
      const results: { name: string; password: string }[] = [];
      const selectedOrgs = orgs.filter((o) => selectedOrgIds.has(o.id));
      await Promise.all(
        selectedOrgs.flatMap((org) =>
          (org.operatori || []).map(async (op) => {
            const password = generateDefaultPassword(org.nome);
            await fetch(`/api/operatori/${op.id}`, {
              method: 'PATCH', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ newPassword: password }),
            });
            results.push({ name: `${op.nome} ${op.cognome}`, password });
          })
        )
      );
      results.sort((a, b) => a.name.localeCompare(b.name, 'it'));
      setOrgBulkResetResults(results);
      refresh();
    } catch { toast.error('Errore durante il reset password'); }
    finally { setOrgBulkLoading(false); }
  }

  async function handleOrgBulkDelete() {
    if (!selectedOrgCount) return;
    if (!confirm(`Eliminare definitivamente ${selectedOrgCount} organizzazion${selectedOrgCount !== 1 ? 'i' : 'e'} con tutti i loro operatori e destinazioni? Questa azione non può essere annullata.`)) return;
    setOrgBulkLoading(true);
    try {
      await Promise.all(
        Array.from(selectedOrgIds).map((id) => fetch(`/api/organizations/${id}`, { method: 'DELETE' }))
      );
      toast.success(`${selectedOrgCount} organizzazioni eliminate`);
      setSelectedOrgIds(new Set());
      refresh();
    } catch { toast.error('Errore durante l\'eliminazione'); }
    finally { setOrgBulkLoading(false); }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <p className="label-luxury text-accent mb-1">Admin</p>
          <h1 className="font-display text-2xl text-primary font-light">Clienti</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {totalOrgs} organizzazioni · {totalOps} operatori
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Mondi Espositivi bulk */}
          {mondiConfirm ? (
            <div className="flex items-center gap-2 bg-cream border border-border rounded px-3 py-2">
              <span className="text-xs text-gray-600">
                {mondiConfirm === 'enable'
                  ? `Abilitare Esposizione per tutti i ${totalOps} operatori?`
                  : `Disabilitare Esposizione per tutti i ${totalOps} operatori?`}
              </span>
              <button
                onClick={() => handleGlobalMondi(mondiConfirm === 'enable')}
                disabled={mondiLoading}
                className="text-xs px-2.5 py-1 bg-primary text-white rounded hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {mondiLoading ? '...' : 'Conferma'}
              </button>
              <button
                onClick={() => setMondiConfirm(null)}
                className="text-xs px-2.5 py-1 border border-border rounded hover:bg-cream transition-colors"
              >
                Annulla
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={() => setMondiConfirm('enable')}
                className="flex items-center gap-1.5 text-xs border border-border rounded px-3 py-1.5 hover:bg-cream transition-colors text-gray-600"
              >
                <Layers size={12} />
                Abilita Esposizione per tutti
              </button>
              <button
                onClick={() => setMondiConfirm('disable')}
                className="flex items-center gap-1.5 text-xs border border-[#C17A5A] rounded px-3 py-1.5 hover:bg-orange-50 transition-colors text-[#C17A5A]"
              >
                <Layers size={12} />
                Disabilita Esposizione per tutti
              </button>
            </>
          )}
          <Button icon={<Plus size={13} />} onClick={() => setShowNewOrg(true)}>
            Nuova organizzazione
          </Button>
        </div>
      </div>

      {/* ── Org bulk action bar ─────────────────────────────────────────────── */}
      {selectedOrgCount > 0 && (
        <div className="sticky top-0 z-31 mb-2 bg-amber-800 text-white rounded-lg px-4 py-3 flex flex-wrap items-center gap-3 shadow-lg animate-slide-up">
          <span className="text-sm font-semibold flex-shrink-0">
            {selectedOrgCount} organizzazion{selectedOrgCount !== 1 ? 'i' : 'e'} selezionate
          </span>
          <div className="flex flex-wrap items-center gap-2 flex-1">
            <button onClick={() => handleOrgBulkSetActive(true)} disabled={orgBulkLoading}
              className="text-xs px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded transition-colors disabled:opacity-50">
              Attiva operatori
            </button>
            <button onClick={() => handleOrgBulkSetActive(false)} disabled={orgBulkLoading}
              className="text-xs px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded transition-colors disabled:opacity-50">
              Disattiva operatori
            </button>
            <button onClick={handleOrgBulkResetPassword} disabled={orgBulkLoading}
              className="text-xs px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded transition-colors disabled:opacity-50">
              Reset password
            </button>
            <button onClick={handleOrgBulkDelete} disabled={orgBulkLoading}
              className="text-xs px-3 py-1.5 bg-red-500/80 hover:bg-red-500 rounded transition-colors disabled:opacity-50">
              Elimina organizzazioni
            </button>
            {orgBulkLoading && <Loader2 size={14} className="animate-spin opacity-70" />}
          </div>
          <button onClick={() => setSelectedOrgIds(new Set())}
            className="text-xs opacity-70 hover:opacity-100 transition-opacity flex items-center gap-1 flex-shrink-0">
            <X size={13} />
            Deseleziona tutte
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-16"><LoadingSpinner /></div>
      ) : orgs.length === 0 ? (
        <p className="text-sm text-gray-400 py-12 text-center">
          {orgSearchText.trim()
            ? `Nessuna organizzazione trovata per "${orgSearchText}"`
            : 'Nessuna organizzazione'}
        </p>
      ) : (
        <div className="space-y-2">
          {/* Search bar */}
          <div className="relative mb-2">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={orgSearchText}
              onChange={(e) => setOrgSearchText(e.target.value)}
              placeholder="Cerca organizzazione..."
              className="w-full pl-8 pr-8 py-2 text-sm bg-white border border-border rounded focus:outline-none focus:border-accent"
            />
            {orgSearchText && (
              <button
                onClick={() => setOrgSearchText('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Select all orgs */}
          <div className="flex items-center gap-2 px-1 pb-1">
            <button onClick={toggleSelectAllOrgs}
              className="text-gray-400 hover:text-primary transition-colors"
              title={allOrgsSelected ? 'Deseleziona tutte' : 'Seleziona tutte le organizzazioni'}>
              {allOrgsSelected
                ? <CheckSquare size={14} className="text-accent" />
                : <Square size={14} />}
            </button>
            <span className="text-xs text-gray-400">
              {allOrgsSelected ? 'Deseleziona tutte' : 'Seleziona tutte le organizzazioni'}
            </span>
          </div>

          {orgs.map((org) => {
            const isOpen = expanded.has(org.id);
            const ops = org.operatori || [];
            const destinazioni = org.destinazioni || [];
            const orgSelectedOps = ops.filter((o) => selectedOpIds.has(o.id));
            const orgSelectedCount = orgSelectedOps.length;
            const allOrgOpsSelected = ops.length > 0 && orgSelectedCount === ops.length;
            const isOrgSelected = selectedOrgIds.has(org.id);

            return (
              <div key={org.id} className={`bg-white border rounded-lg overflow-hidden transition-colors ${isOrgSelected ? 'border-amber-400 bg-amber-50/40' : 'border-border'}`}>
                {/* Org row — mobile: card vertical; desktop: single flex row */}
                <div className="px-3 py-3 hover:bg-cream/30 transition-colors">
                  {/* Mobile layout */}
                  <div className="md:hidden space-y-1">
                    {/* Name (full width, no truncate) */}
                    <p className="font-medium text-primary text-sm leading-snug">{org.nome}</p>
                    {/* Stats */}
                    <p className="text-xs text-gray-400">
                      {ops.length} operatori · {destinazioni.length} destinazioni
                      {orgSelectedCount > 0 && (
                        <span className="ml-1.5 bg-accent text-white text-2xs font-bold px-1.5 py-0.5 rounded-full">
                          {orgSelectedCount} sel.
                        </span>
                      )}
                    </p>
                    {/* Actions row */}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleOrgSelect(org.id); }}
                        className="text-gray-400 hover:text-primary transition-colors p-1 -ml-1">
                        {isOrgSelected
                          ? <CheckSquare size={15} className="text-amber-600" />
                          : <Square size={15} />}
                      </button>
                      <button
                        onClick={() => toggleExpand(org.id)}
                        className="flex-1 flex items-center justify-center gap-1 text-xs text-gray-500 hover:text-primary border border-border rounded py-1 transition-colors">
                        {isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                        {isOpen ? 'Chiudi' : 'Espandi'}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditOrgModal(org); }}
                        className="flex items-center gap-1 text-xs text-gray-400 hover:text-primary border border-border rounded px-2.5 py-1 hover:bg-cream transition-colors">
                        <Edit2 size={12} />
                        Modifica
                      </button>
                    </div>
                  </div>

                  {/* Desktop layout (original) */}
                  <div className="hidden md:flex items-center gap-3">
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleOrgSelect(org.id); }}
                      className="text-gray-400 hover:text-primary transition-colors flex-shrink-0">
                      {isOrgSelected
                        ? <CheckSquare size={14} className="text-amber-600" />
                        : <Square size={14} />}
                    </button>
                    <button
                      onClick={() => toggleExpand(org.id)}
                      className="flex-1 flex items-center gap-3 text-left min-w-0">
                      <span className="text-gray-400 flex-shrink-0">
                        {isOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                      </span>
                      <span className="flex-1 font-medium text-primary text-sm">{org.nome}</span>
                      <span className="flex items-center gap-1.5 text-xs text-gray-400 mr-2 flex-shrink-0">
                        <Users size={12} />
                        {ops.length} operatori
                        {orgSelectedCount > 0 && (
                          <span className="ml-1 bg-accent text-white text-2xs font-bold w-4 h-4 rounded-full flex items-center justify-center">
                            {orgSelectedCount}
                          </span>
                        )}
                      </span>
                      <span className="flex items-center gap-1.5 text-xs text-gray-400 flex-shrink-0">
                        <Store size={12} />
                        {destinazioni.length} destinazioni
                      </span>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditOrgModal(org); }}
                      className="flex items-center gap-1 text-xs text-gray-400 hover:text-primary px-2 py-1 rounded hover:bg-cream transition-colors flex-shrink-0">
                      <Edit2 size={12} />
                      <span>Modifica</span>
                    </button>
                  </div>
                </div>

                {/* Expanded content */}
                {isOpen && (
                  <div className="border-t border-border bg-cream/30 px-4 py-4 space-y-5">
                    {/* Operators section */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Operatori</p>
                        <Button variant="ghost" size="sm" icon={<Plus size={12} />}
                          onClick={() => setOpModal({ orgId: org.id, orgNome: org.nome })}>
                          Aggiungi operatore
                        </Button>
                      </div>

                      {/* ── Per-org bulk action bar ──────────────────────── */}
                      {orgSelectedCount > 0 && (
                        <OrgOperatorsBulkBar
                          count={orgSelectedCount}
                          operatorIds={orgSelectedOps.map((o) => o.id)}
                          orgId={org.id}
                          onDeselect={() => clearOrgOps(ops)}
                          onDone={(results) => {
                            clearOrgOps(ops);
                            refresh();
                            if (results) setBulkResetResults(results);
                          }}
                        />
                      )}

                      {ops.length === 0 ? (
                        <p className="text-xs text-gray-400 italic">Nessun operatore</p>
                      ) : (
                        <>
                          {/* Select all + desktop table header */}
                          <div className="hidden md:block bg-white rounded border border-border overflow-hidden">
                            <table className="w-full text-xs">
                              <thead className="bg-cream">
                                <tr>
                                  <th className="px-3 py-2 w-8">
                                    <button
                                      onClick={() => toggleSelectAllInOrg(ops)}
                                      className="text-gray-400 hover:text-primary transition-colors"
                                      title={allOrgOpsSelected ? 'Deseleziona tutti' : 'Seleziona tutti'}>
                                      {allOrgOpsSelected
                                        ? <CheckSquare size={13} className="text-accent" />
                                        : <Square size={13} />}
                                    </button>
                                  </th>
                                  <th className="text-left px-3 py-2 font-medium text-gray-500 uppercase tracking-wider text-2xs">Nome</th>
                                  <th className="text-left px-3 py-2 font-medium text-gray-500 uppercase tracking-wider text-2xs">Email</th>
                                  <th className="text-left px-3 py-2 font-medium text-gray-500 uppercase tracking-wider text-2xs">Stato</th>
                                  <th className="text-left px-3 py-2 font-medium text-gray-500 uppercase tracking-wider text-2xs hidden xl:table-cell">Esposizione</th>
                                  <th className="w-24"></th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border">
                                {ops.map((op) => {
                                  const isSelected = selectedOpIds.has(op.id);
                                  return (
                                    <tr key={op.id} className={`transition-colors ${isSelected ? 'bg-accent/8' : 'hover:bg-cream/50'}`}>
                                      <td className="px-3 py-2">
                                        <button onClick={() => toggleOpSelect(op.id)}
                                          className="text-gray-400 hover:text-primary transition-colors">
                                          {isSelected
                                            ? <CheckSquare size={13} className="text-accent" />
                                            : <Square size={13} />}
                                        </button>
                                      </td>
                                      <td className="px-3 py-2">
                                        <div className="flex items-center gap-1.5">
                                          <span className="font-medium text-primary">{op.nome} {op.cognome}</span>
                                        </div>
                                      </td>
                                      <td className="px-3 py-2 text-gray-500">{op.email}</td>
                                      <td className="px-3 py-2">
                                        <Badge variant={op.attivo ? 'success' : 'default'} size="xs">
                                          {op.attivo ? 'Attivo' : 'Inattivo'}
                                        </Badge>
                                      </td>
                                      <td className="px-3 py-2 hidden xl:table-cell">
                                        <button
                                          onClick={() => handleToggleMondiEspositivi(op)}
                                          className={`flex items-center gap-1 text-2xs px-2 py-0.5 rounded transition-colors ${
                                            op.featureMondiEspositivi
                                              ? 'bg-violet-100 text-violet-700 hover:bg-violet-200'
                                              : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                          }`}
                                          title={op.featureMondiEspositivi ? 'Disabilita Esposizione' : 'Abilita Esposizione'}
                                        >
                                          <Layers size={10} />
                                          {op.featureMondiEspositivi ? 'ON' : 'OFF'}
                                        </button>
                                      </td>
                                      <td className="px-3 py-2">
                                        <div className="flex items-center gap-1 justify-end">
                                          <button onClick={() => setOpModal({ orgId: org.id, orgNome: org.nome, operator: op })}
                                            className="p-1 text-gray-400 hover:text-primary rounded hover:bg-cream transition-colors" title="Modifica">
                                            <Edit2 size={12} />
                                          </button>
                                          <button onClick={() => handleResetPassword(op, org.nome)}
                                            className="p-1 text-gray-400 hover:text-accent rounded hover:bg-cream transition-colors" title="Reset password (mostra)">
                                            <KeyRound size={12} />
                                          </button>
                                          <button
                                            onClick={() => handleSendCredentials(op)}
                                            disabled={sendingCreds === op.id}
                                            className="p-1 text-blue-500 hover:bg-blue-50 rounded transition-colors disabled:opacity-40"
                                            title="Invia credenziali via email (reset + invio)"
                                          >
                                            <Send size={12} />
                                          </button>
                                          <button onClick={() => handleToggleOperator(op)}
                                            className="p-1 text-gray-400 hover:text-primary rounded hover:bg-cream transition-colors"
                                            title={op.attivo ? 'Disattiva' : 'Attiva'}>
                                            {op.attivo
                                              ? <ToggleRight size={14} className="text-green-500" />
                                              : <ToggleLeft size={14} />}
                                          </button>
                                          <button onClick={() => handleToggleMondiEspositivi(op)}
                                            className="p-1 xl:hidden text-gray-400 hover:text-violet-600 rounded hover:bg-violet-50 transition-colors"
                                            title={op.featureMondiEspositivi ? 'Disabilita Esposizione' : 'Abilita Esposizione'}>
                                            <Layers size={12} className={op.featureMondiEspositivi ? 'text-violet-500' : ''} />
                                          </button>
                                          <button onClick={() => handleDeleteOperator(op)}
                                            className="p-1 text-gray-400 hover:text-red-500 rounded hover:bg-red-50 transition-colors" title="Elimina">
                                            <Trash2 size={12} />
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>

                          {/* Mobile: card list */}
                          <div className="md:hidden space-y-2">
                            {/* Select all on mobile */}
                            <button
                              onClick={() => toggleSelectAllInOrg(ops)}
                              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-primary transition-colors">
                              {allOrgOpsSelected
                                ? <CheckSquare size={13} className="text-accent" />
                                : <Square size={13} />}
                              {allOrgOpsSelected ? 'Deseleziona tutti' : 'Seleziona tutti'}
                            </button>
                            {ops.map((op) => {
                              const isSelected = selectedOpIds.has(op.id);
                              return (
                                <div
                                  key={op.id}
                                  className={`rounded border p-3 space-y-2 transition-colors ${isSelected ? 'border-accent/40 bg-accent/5' : 'border-border bg-white'}`}
                                >
                                  {/* Name + status */}
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <p className="font-medium text-primary text-sm">{op.nome} {op.cognome}</p>
                                      </div>
                                      <p
                                        className="text-xs text-gray-500 mt-0.5"
                                        style={{ overflowWrap: 'break-word', wordBreak: 'break-all' }}
                                      >
                                        {op.email}
                                      </p>
                                    </div>
                                    <Badge variant={op.attivo ? 'success' : 'default'} size="xs">
                                      {op.attivo ? 'Attivo' : 'Inattivo'}
                                    </Badge>
                                  </div>
                                  {/* Actions */}
                                  <div className="flex items-center gap-1 pt-1 border-t border-border/50">
                                    <button onClick={() => toggleOpSelect(op.id)}
                                      className="p-1.5 text-gray-400 hover:text-primary transition-colors" title="Seleziona">
                                      {isSelected
                                        ? <CheckSquare size={14} className="text-accent" />
                                        : <Square size={14} />}
                                    </button>
                                    <div className="flex-1" />
                                    <button onClick={() => setOpModal({ orgId: org.id, orgNome: org.nome, operator: op })}
                                      className="p-1.5 text-gray-400 hover:text-primary rounded hover:bg-cream transition-colors" title="Modifica">
                                      <Edit2 size={14} />
                                    </button>
                                    <button onClick={() => handleResetPassword(op, org.nome)}
                                      className="p-1.5 text-gray-400 hover:text-accent rounded hover:bg-cream transition-colors" title="Reset password (mostra)">
                                      <KeyRound size={14} />
                                    </button>
                                    <button
                                      onClick={() => handleSendCredentials(op)}
                                      disabled={sendingCreds === op.id}
                                      className="p-1.5 text-blue-500 hover:bg-blue-50 rounded transition-colors disabled:opacity-40"
                                      title="Invia credenziali via email (reset + invio)"
                                    >
                                      <Send size={14} />
                                    </button>
                                    <button onClick={() => handleToggleOperator(op)}
                                      className="p-1.5 text-gray-400 hover:text-primary rounded hover:bg-cream transition-colors"
                                      title={op.attivo ? 'Disattiva' : 'Attiva'}>
                                      {op.attivo
                                        ? <ToggleRight size={16} className="text-green-500" />
                                        : <ToggleLeft size={16} />}
                                    </button>
                                    <button onClick={() => handleToggleMondiEspositivi(op)}
                                      className="p-1.5 text-gray-400 hover:text-violet-600 rounded hover:bg-violet-50 transition-colors"
                                      title={op.featureMondiEspositivi ? 'Disabilita Esposizione' : 'Abilita Esposizione'}>
                                      <Layers size={14} className={op.featureMondiEspositivi ? 'text-violet-500' : ''} />
                                    </button>
                                    <button onClick={() => handleDeleteOperator(op)}
                                      className="p-1.5 text-gray-400 hover:text-red-500 rounded hover:bg-red-50 transition-colors" title="Elimina">
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Destinazioni */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Destinazioni / Punti Vendita</p>
                        <Button variant="ghost" size="sm" icon={<Plus size={12} />}
                          onClick={() => setDestinazioneModal({ orgId: org.id })}>
                          Aggiungi destinazione
                        </Button>
                      </div>
                      {destinazioni.length === 0 ? (
                        <p className="text-xs text-gray-400 italic">Nessuna destinazione — gli operatori non potranno fare ordini finché non viene creata almeno una destinazione.</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {destinazioni.map((d) => (
                            <div key={d.id}
                              className="flex items-center gap-2 bg-white border border-border rounded px-3 py-2 text-xs group">
                              <span className="text-gray-400">{TIPO_ICONS[d.tipo]}</span>
                              <span className="font-medium text-primary">{d.nome}</span>
                              {d.citta && (
                                <span className="flex items-center gap-0.5 text-gray-400">
                                  <MapPin size={10} />{d.citta}
                                </span>
                              )}
                              <Badge variant="default" size="xs">{TIPO_LABELS[d.tipo]}</Badge>
                              <div className="flex gap-0.5 ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => setDestinazioneModal({ orgId: org.id, destinazione: d })}
                                  className="p-0.5 text-gray-400 hover:text-primary rounded transition-colors" title="Modifica">
                                  <Edit2 size={11} />
                                </button>
                                <button onClick={() => handleDeleteDestinazione(d)}
                                  className="p-0.5 text-gray-400 hover:text-red-500 rounded transition-colors" title="Elimina">
                                  <Trash2 size={11} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modals ────────────────────────────────────────────────────────────── */}

      {showNewOrg && (
        <CreateOrgModal
          onClose={() => setShowNewOrg(false)}
          onSave={() => { setShowNewOrg(false); refresh(); }}
        />
      )}

      {editOrgModal && (
        <EditOrgModal org={editOrgModal} onClose={() => setEditOrgModal(null)}
          onSave={() => { setEditOrgModal(null); refresh(); }} />
      )}

      {opModal && (
        <OperatorModal isOpen onClose={() => setOpModal(null)}
          onSave={() => { setOpModal(null); refresh(); }}
          operator={opModal.operator} orgId={opModal.orgId} orgNome={opModal.orgNome} />
      )}

      {destinazioneModal && (
        <DestinazioneModal isOpen onClose={() => setDestinazioneModal(null)}
          onSave={() => { setDestinazioneModal(null); refresh(); }}
          destinazione={destinazioneModal.destinazione} orgId={destinazioneModal.orgId} />
      )}

      {/* Single password reset */}
      <Modal isOpen={!!resetResult} onClose={() => setResetResult(null)} title="Password resettata" size="sm"
        footer={<Button onClick={() => setResetResult(null)}>Ho preso nota, chiudi</Button>}>
        {resetResult && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              La password di <span className="font-semibold text-primary">{resetResult.name}</span> è stata resettata.
            </p>
            <div className="bg-cream border border-border rounded p-4">
              <p className="text-2xs text-gray-500 uppercase tracking-wider mb-2">Nuova password</p>
              <div className="flex items-center gap-2">
                <span className="font-mono text-base font-bold text-primary flex-1">{resetResult.password}</span>
                <button onClick={() => { navigator.clipboard.writeText(resetResult.password); toast.success('Copiata'); }}
                  className="text-gray-400 hover:text-primary transition-colors">
                  <Copy size={14} />
                </button>
              </div>
            </div>
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
              Comunica questa password all&apos;operatore. Non verrà mostrata di nuovo.
            </p>
          </div>
        )}
      </Modal>

      {/* Bulk password reset modal */}
      {bulkResetResults && (
        <BulkResetModal results={bulkResetResults} onClose={() => setBulkResetResults(null)} />
      )}

      {/* Org bulk password reset */}
      <Modal isOpen={!!orgBulkResetResults} onClose={() => setOrgBulkResetResults(null)} title="Password resettate (organizzazioni)" size="md"
        footer={<Button onClick={() => setOrgBulkResetResults(null)}>Ho preso nota, chiudi</Button>}>
        {orgBulkResetResults && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Password resettate per <span className="font-semibold text-primary">{orgBulkResetResults.length} operatori</span>.
            </p>
            <div className="bg-cream border border-border rounded divide-y divide-border max-h-72 overflow-y-auto">
              {orgBulkResetResults.map((r) => (
                <div key={r.name} className="flex items-center justify-between px-4 py-2.5 gap-3">
                  <span className="text-sm text-primary truncate">{r.name}</span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="font-mono text-sm font-bold text-primary">{r.password}</span>
                    <button onClick={() => { navigator.clipboard.writeText(r.password); toast.success('Copiata'); }}
                      className="text-gray-400 hover:text-primary transition-colors">
                      <Copy size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
              Comunica le password ai rispettivi operatori. Non verranno mostrate di nuovo.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
