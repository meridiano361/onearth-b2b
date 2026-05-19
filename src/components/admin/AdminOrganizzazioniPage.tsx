'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus, ChevronDown, ChevronRight, Edit2, Trash2,
  ToggleLeft, ToggleRight, KeyRound, Store, Globe, Radio, Package,
  Users, MapPin, Copy,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import toast from 'react-hot-toast';
import type { Organization, Operator, Canale, CanaleTipo } from '@/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TIPO_LABELS: Record<CanaleTipo, string> = {
  BOTTEGA: 'Bottega',
  TENDONE: 'Tendone',
  ONLINE: 'Online',
  ALTRO: 'Altro',
};

const TIPO_ICONS: Record<CanaleTipo, React.ReactNode> = {
  BOTTEGA: <Store size={12} />,
  TENDONE: <Radio size={12} />,
  ONLINE: <Globe size={12} />,
  ALTRO: <Package size={12} />,
};

function generateDefaultPassword(orgNome: string): string {
  const slug = orgNome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z]/g, '');
  return 'onearth_' + slug.substring(0, 5);
}

// ─── Modals ───────────────────────────────────────────────────────────────────

interface OperatorFormData {
  nome: string; cognome: string; email: string; telefono: string;
  password: string; attivo: boolean;
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
    nome: operator?.nome || '',
    cognome: operator?.cognome || '',
    email: operator?.email || '',
    telefono: operator?.telefono || '',
    password: isEdit ? '' : defaultPwd,
    attivo: operator?.attivo ?? true,
  });
  const [saving, setSaving] = useState(false);

  const set = (k: keyof OperatorFormData) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  async function handleSave() {
    setSaving(true);
    try {
      const url = isEdit ? `/api/operatori/${operator!.id}` : `/api/organizations/${orgId}/operatori`;
      const method = isEdit ? 'PATCH' : 'POST';
      const body: any = { nome: form.nome, cognome: form.cognome, email: form.email, telefono: form.telefono || null, attivo: form.attivo };
      if (isEdit) { if (form.password) body.newPassword = form.password; }
      else body.password = form.password;

      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Errore'); }
      toast.success(isEdit ? 'Operatore aggiornato' : 'Operatore creato');
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
          <Input label="Nome *" value={form.nome} onChange={set('nome')} placeholder="Maria" />
          <Input label="Cognome *" value={form.cognome} onChange={set('cognome')} placeholder="Rossi" />
        </div>
        <Input label="Email *" type="email" value={form.email} onChange={set('email')} placeholder="m.rossi@org.it" />
        <Input label="Telefono" value={form.telefono} onChange={set('telefono')} placeholder="+39 333 123456" />
        <div>
          <label className="block text-xs font-medium tracking-wide uppercase text-gray-600 mb-2">
            {isEdit ? 'Nuova Password (vuoto = invariata)' : 'Password *'}
          </label>
          <div className="flex gap-2">
            <Input
              value={form.password}
              onChange={set('password')}
              type="text"
              placeholder={isEdit ? '••••••••' : defaultPwd}
              className="flex-1"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" id="op-attivo" checked={form.attivo} onChange={set('attivo')} className="w-4 h-4 accent-accent" />
          <label htmlFor="op-attivo" className="text-sm text-primary">Attivo (può accedere)</label>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={onClose}>Annulla</Button>
          <Button onClick={handleSave} loading={saving}>{isEdit ? 'Salva' : 'Crea'}</Button>
        </div>
      </div>
    </Modal>
  );
}

function CanaleModal({
  isOpen, onClose, onSave, canale, orgId,
}: {
  isOpen: boolean; onClose: () => void; onSave: () => void;
  canale?: Canale; orgId: string;
}) {
  const isEdit = !!canale;
  const [nome, setNome] = useState(canale?.nome || '');
  const [tipo, setTipo] = useState<CanaleTipo>(canale?.tipo || 'BOTTEGA');
  const [citta, setCitta] = useState(canale?.citta || '');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const url = isEdit ? `/api/canali/${canale!.id}` : `/api/organizations/${orgId}/canali`;
      const method = isEdit ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, tipo, citta: citta || null }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Errore'); }
      toast.success(isEdit ? 'Canale aggiornato' : 'Canale creato');
      onSave();
    } catch (e: any) {
      toast.error(e.message || 'Operazione fallita');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Modifica Canale' : 'Nuovo Canale'} size="sm">
      <div className="space-y-3">
        <Input label="Nome *" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Bottega Centro" />
        <div>
          <label className="block text-xs font-medium tracking-wide uppercase text-gray-600 mb-2">Tipo</label>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as CanaleTipo)}
            className="w-full px-4 py-2.5 bg-white border border-border rounded text-sm focus:outline-none focus:border-accent"
          >
            {(Object.keys(TIPO_LABELS) as CanaleTipo[]).map((t) => (
              <option key={t} value={t}>{TIPO_LABELS[t]}</option>
            ))}
          </select>
        </div>
        <Input label="Città" value={citta} onChange={(e) => setCitta(e.target.value)} placeholder="Milano" />
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={onClose}>Annulla</Button>
          <Button onClick={handleSave} loading={saving}>{isEdit ? 'Salva' : 'Crea'}</Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminOrganizzazioniPage() {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [opModal, setOpModal] = useState<{ orgId: string; orgNome: string; operator?: Operator } | null>(null);
  const [canaleModal, setCanaleModal] = useState<{ orgId: string; canale?: Canale } | null>(null);
  const [resetResult, setResetResult] = useState<{ name: string; password: string } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-organizations'],
    queryFn: async () => {
      const res = await fetch('/api/organizations');
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  const orgs: Organization[] = data?.data || [];

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ['admin-organizations'] });
  }

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleToggleOperator(op: Operator) {
    try {
      const res = await fetch(`/api/operatori/${op.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attivo: !op.attivo }),
      });
      if (!res.ok) throw new Error('Failed');
      refresh();
      toast.success(`Operatore ${op.attivo ? 'disattivato' : 'attivato'}`);
    } catch {
      toast.error('Errore');
    }
  }

  async function handleDeleteOperator(op: Operator) {
    if (!confirm(`Eliminare ${op.nome} ${op.cognome}?`)) return;
    try {
      const res = await fetch(`/api/operatori/${op.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error || 'Errore');
      refresh();
      toast.success('Operatore eliminato');
    } catch (e: any) {
      toast.error(e.message || 'Errore');
    }
  }

  function handleResetPassword(op: Operator, orgNome: string) {
    const password = generateDefaultPassword(orgNome);
    // Apply immediately and show it
    fetch(`/api/operatori/${op.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPassword: password }),
    })
      .then((r) => r.json())
      .then(() => {
        setResetResult({ name: `${op.nome} ${op.cognome}`, password });
        refresh();
      })
      .catch(() => toast.error('Errore nel reset password'));
  }

  async function handleDeleteCanale(canale: Canale) {
    if (!confirm(`Eliminare il canale "${canale.nome}"?`)) return;
    try {
      const res = await fetch(`/api/canali/${canale.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error || 'Errore');
      refresh();
      toast.success('Canale eliminato');
    } catch (e: any) {
      toast.error(e.message || 'Errore');
    }
  }

  const totalOrgs = orgs.length;
  const totalOps = orgs.reduce((s, o) => s + (o.operatori?.length || 0), 0);

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
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><LoadingSpinner /></div>
      ) : orgs.length === 0 ? (
        <p className="text-sm text-gray-400 py-12 text-center">Nessuna organizzazione</p>
      ) : (
        <div className="space-y-2">
          {orgs.map((org) => {
            const isOpen = expanded.has(org.id);
            const ops = org.operatori || [];
            const canali = org.canali || [];

            return (
              <div key={org.id} className="bg-white border border-border rounded-lg overflow-hidden">
                {/* Org row */}
                <button
                  onClick={() => toggleExpand(org.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-cream transition-colors text-left"
                >
                  <span className="text-gray-400 flex-shrink-0">
                    {isOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                  </span>
                  <span className="flex-1 font-medium text-primary text-sm">{org.nome}</span>
                  <span className="flex items-center gap-1.5 text-xs text-gray-400 mr-4">
                    <Users size={12} />
                    {ops.length} operatori
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-gray-400 mr-2">
                    <Store size={12} />
                    {canali.length} canali
                  </span>
                </button>

                {/* Expanded content */}
                {isOpen && (
                  <div className="border-t border-border bg-cream/30 px-4 py-4 space-y-5">
                    {/* Operators */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Operatori</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<Plus size={12} />}
                          onClick={() => setOpModal({ orgId: org.id, orgNome: org.nome })}
                        >
                          Aggiungi
                        </Button>
                      </div>
                      {ops.length === 0 ? (
                        <p className="text-xs text-gray-400 italic">Nessun operatore</p>
                      ) : (
                        <div className="bg-white rounded border border-border overflow-hidden">
                          <table className="w-full text-xs">
                            <thead className="bg-cream">
                              <tr>
                                <th className="text-left px-3 py-2 font-medium text-gray-500 uppercase tracking-wider text-2xs">Nome</th>
                                <th className="text-left px-3 py-2 font-medium text-gray-500 uppercase tracking-wider text-2xs">Email</th>
                                <th className="text-left px-3 py-2 font-medium text-gray-500 uppercase tracking-wider text-2xs">Stato</th>
                                <th className="w-24"></th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {ops.map((op) => (
                                <tr key={op.id} className="hover:bg-cream/50">
                                  <td className="px-3 py-2">
                                    <span className="font-medium text-primary">{op.nome} {op.cognome}</span>
                                  </td>
                                  <td className="px-3 py-2 text-gray-500">{op.email}</td>
                                  <td className="px-3 py-2">
                                    <Badge variant={op.attivo ? 'success' : 'default'} size="xs">
                                      {op.attivo ? 'Attivo' : 'Inattivo'}
                                    </Badge>
                                  </td>
                                  <td className="px-3 py-2">
                                    <div className="flex items-center gap-1 justify-end">
                                      <button
                                        onClick={() => setOpModal({ orgId: org.id, orgNome: org.nome, operator: op })}
                                        className="p-1 text-gray-400 hover:text-primary rounded hover:bg-cream transition-colors"
                                        title="Modifica"
                                      >
                                        <Edit2 size={12} />
                                      </button>
                                      <button
                                        onClick={() => handleResetPassword(op, org.nome)}
                                        className="p-1 text-gray-400 hover:text-accent rounded hover:bg-cream transition-colors"
                                        title="Reset password"
                                      >
                                        <KeyRound size={12} />
                                      </button>
                                      <button
                                        onClick={() => handleToggleOperator(op)}
                                        className="p-1 text-gray-400 hover:text-primary rounded hover:bg-cream transition-colors"
                                        title={op.attivo ? 'Disattiva' : 'Attiva'}
                                      >
                                        {op.attivo
                                          ? <ToggleRight size={14} className="text-green-500" />
                                          : <ToggleLeft size={14} />
                                        }
                                      </button>
                                      <button
                                        onClick={() => handleDeleteOperator(op)}
                                        className="p-1 text-gray-400 hover:text-red-500 rounded hover:bg-red-50 transition-colors"
                                        title="Elimina"
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* Canali */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Canali / Punti Vendita</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<Plus size={12} />}
                          onClick={() => setCanaleModal({ orgId: org.id })}
                        >
                          Aggiungi canale
                        </Button>
                      </div>
                      {canali.length === 0 ? (
                        <p className="text-xs text-gray-400 italic">Nessun canale — gli operatori non potranno fare ordini finché non viene creato almeno un canale.</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {canali.map((c) => (
                            <div
                              key={c.id}
                              className="flex items-center gap-2 bg-white border border-border rounded px-3 py-2 text-xs group"
                            >
                              <span className="text-gray-400">{TIPO_ICONS[c.tipo]}</span>
                              <span className="font-medium text-primary">{c.nome}</span>
                              {c.citta && (
                                <span className="flex items-center gap-0.5 text-gray-400">
                                  <MapPin size={10} />{c.citta}
                                </span>
                              )}
                              <Badge variant="default" size="xs">{TIPO_LABELS[c.tipo]}</Badge>
                              <div className="flex gap-0.5 ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => setCanaleModal({ orgId: org.id, canale: c })}
                                  className="p-0.5 text-gray-400 hover:text-primary rounded transition-colors"
                                  title="Modifica"
                                >
                                  <Edit2 size={11} />
                                </button>
                                <button
                                  onClick={() => handleDeleteCanale(c)}
                                  className="p-0.5 text-gray-400 hover:text-red-500 rounded transition-colors"
                                  title="Elimina"
                                >
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

      {/* Operator modal */}
      {opModal && (
        <OperatorModal
          isOpen
          onClose={() => setOpModal(null)}
          onSave={() => { setOpModal(null); refresh(); }}
          operator={opModal.operator}
          orgId={opModal.orgId}
          orgNome={opModal.orgNome}
        />
      )}

      {/* Canale modal */}
      {canaleModal && (
        <CanaleModal
          isOpen
          onClose={() => setCanaleModal(null)}
          onSave={() => { setCanaleModal(null); refresh(); }}
          canale={canaleModal.canale}
          orgId={canaleModal.orgId}
        />
      )}

      {/* Password reset reveal */}
      <Modal
        isOpen={!!resetResult}
        onClose={() => setResetResult(null)}
        title="Password resettata"
        size="sm"
        footer={<Button onClick={() => setResetResult(null)}>Ho preso nota, chiudi</Button>}
      >
        {resetResult && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              La password di <span className="font-semibold text-primary">{resetResult.name}</span> è stata resettata.
            </p>
            <div className="bg-cream border border-border rounded p-4">
              <p className="text-2xs text-gray-500 uppercase tracking-wider mb-2">Nuova password</p>
              <div className="flex items-center gap-2">
                <span className="font-mono text-base font-bold text-primary flex-1">{resetResult.password}</span>
                <button
                  onClick={() => { navigator.clipboard.writeText(resetResult.password); toast.success('Copiata'); }}
                  className="text-gray-400 hover:text-primary transition-colors"
                >
                  <Copy size={14} />
                </button>
              </div>
            </div>
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
              Comunica questa password all'operatore. Non verrà mostrata di nuovo.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
