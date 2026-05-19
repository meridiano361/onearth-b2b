'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Power, X, Eye, EyeOff, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDate } from '@/lib/utils';

type AdminRole = 'SUPER_ADMIN' | 'ADMIN' | 'COMMERCIALE' | 'MAGAZZINO';

interface AdminUser {
  id: string;
  companyName: string;
  email: string;
  role: AdminRole;
  isActive: boolean;
  createdAt: string;
  customerCode: string;
}

const ROLE_LABELS: Record<AdminRole, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  COMMERCIALE: 'Commerciale',
  MAGAZZINO: 'Magazzino',
};

const ROLE_BADGE: Record<AdminRole, string> = {
  SUPER_ADMIN: 'bg-purple-100 text-purple-700',
  ADMIN: 'bg-blue-100 text-blue-700',
  COMMERCIALE: 'bg-green-100 text-green-700',
  MAGAZZINO: 'bg-amber-100 text-amber-700',
};

const ROLE_DESC: Record<AdminRole, string> = {
  SUPER_ADMIN: 'Accesso totale a tutto, incluse Impostazioni',
  ADMIN: 'Accesso a tutto tranne Impostazioni',
  COMMERCIALE: 'Ordini e Clienti (sola lettura su Prodotti)',
  MAGAZZINO: 'Solo Prodotti e Classificazione',
};

function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#';
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// ─── User Modal ───────────────────────────────────────────────────────────────

interface ModalProps {
  user?: AdminUser;
  onClose: () => void;
  onSaved: () => void;
}

function UserModal({ user, onClose, onSaved }: ModalProps) {
  const isEdit = !!user;
  const [name, setName] = useState(user?.companyName ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [role, setRole] = useState<AdminRole>(user?.role ?? 'ADMIN');
  const [isActive, setIsActive] = useState(user?.isActive ?? true);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) { toast.error('Nome ed email obbligatori'); return; }
    if (!isEdit && password.length < 6) { toast.error('Password minimo 6 caratteri'); return; }

    setSaving(true);
    try {
      const body: any = { companyName: name.trim(), email: email.trim(), role, isActive };
      if (password) body.password = password;

      const res = await fetch(
        isEdit ? `/api/admin/users/${user!.id}` : '/api/admin/users',
        {
          method: isEdit ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Errore');
      toast.success(isEdit ? 'Utente aggiornato' : 'Utente creato');
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-lg shadow-luxury-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-primary">
            {isEdit ? 'Modifica utente' : 'Nuovo utente admin'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-primary"><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Nome */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nome e cognome *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Mario Rossi"
              className="w-full h-9 border border-border rounded px-3 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Email *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="mario@azienda.it"
              className="w-full h-9 border border-border rounded px-3 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Password {isEdit ? '(lascia vuoto per non cambiare)' : '*'}
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isEdit ? '••••••••' : 'min. 6 caratteri'}
                  className="w-full h-9 border border-border rounded px-3 pr-9 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <button
                type="button"
                onClick={() => { const p = generatePassword(); setPassword(p); setShowPwd(true); }}
                className="flex items-center gap-1 px-2.5 text-xs border border-border rounded hover:bg-cream transition-colors text-gray-500"
                title="Genera password"
              >
                <RefreshCw size={12} />
              </button>
            </div>
          </div>

          {/* Ruolo */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Ruolo *</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as AdminRole)}
              className="w-full h-9 border border-border rounded px-3 text-sm focus:outline-none focus:ring-1 focus:ring-accent bg-white"
            >
              {(Object.keys(ROLE_LABELS) as AdminRole[]).map((r) => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </select>
            <p className="text-2xs text-gray-400 mt-1">{ROLE_DESC[role]}</p>
          </div>

          {/* Stato */}
          <div className="flex items-center gap-3">
            <label className="text-xs font-medium text-gray-600">Stato</label>
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded border transition-colors ${
                isActive
                  ? 'bg-green-50 border-green-200 text-green-700'
                  : 'bg-gray-50 border-border text-gray-500'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
              {isActive ? 'Attivo' : 'Disattivo'}
            </button>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 text-xs border border-border rounded text-gray-500 hover:bg-cream transition-colors"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2 text-xs bg-primary text-white rounded hover:bg-warm-darker disabled:opacity-50 transition-colors"
            >
              {saving ? 'Salvataggio...' : isEdit ? 'Salva modifiche' : 'Crea utente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminImpostazioniPage({ currentUserId }: { currentUserId: string }) {
  const qc = useQueryClient();
  const [modalUser, setModalUser] = useState<AdminUser | null | undefined>(undefined); // undefined=closed, null=new
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery<{ data: AdminUser[] }>({
    queryKey: ['admin-users'],
    queryFn: () => fetch('/api/admin/users').then((r) => r.json()),
  });

  const users = data?.data ?? [];

  async function handleToggleActive(user: AdminUser) {
    setTogglingId(user.id);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success(user.isActive ? 'Utente disattivato' : 'Utente attivato');
      qc.invalidateQueries({ queryKey: ['admin-users'] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setTogglingId(null);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success('Utente eliminato');
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      setConfirmDeleteId(null);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <p className="label-luxury text-accent mb-1">Admin</p>
          <h1 className="font-display text-2xl text-primary font-light">Impostazioni</h1>
        </div>
      </div>

      {/* Section: Utenti Admin */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-primary">Utenti Admin</h2>
            <p className="text-2xs text-gray-400 mt-0.5">{users.length} utenti con accesso al pannello</p>
          </div>
          <button
            onClick={() => setModalUser(null)}
            className="flex items-center gap-1.5 text-xs bg-primary text-white px-3 py-2 rounded hover:bg-warm-darker transition-colors"
          >
            <Plus size={13} />
            Aggiungi utente
          </button>
        </div>

        {isLoading ? (
          <p className="text-sm text-gray-400 py-8 text-center">Caricamento...</p>
        ) : users.length === 0 ? (
          <p className="text-sm text-gray-400 py-8 text-center">Nessun utente trovato</p>
        ) : (
          <div className="bg-white border border-border rounded overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-cream/40">
                  <th className="text-left px-4 py-3 text-2xs font-medium uppercase tracking-wide text-gray-400">Nome</th>
                  <th className="text-left px-4 py-3 text-2xs font-medium uppercase tracking-wide text-gray-400">Email</th>
                  <th className="text-left px-4 py-3 text-2xs font-medium uppercase tracking-wide text-gray-400">Ruolo</th>
                  <th className="text-left px-4 py-3 text-2xs font-medium uppercase tracking-wide text-gray-400 hidden sm:table-cell">Creato</th>
                  <th className="text-left px-4 py-3 text-2xs font-medium uppercase tracking-wide text-gray-400">Stato</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-border/50 last:border-0 hover:bg-cream/20 transition-colors">
                    <td className="px-4 py-3 font-medium text-primary">{user.companyName}</td>
                    <td className="px-4 py-3 text-gray-500">{user.email}</td>
                    <td className="px-4 py-3">
                      <span className={`text-2xs font-semibold px-2 py-0.5 rounded ${ROLE_BADGE[user.role]}`}>
                        {ROLE_LABELS[user.role]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 hidden sm:table-cell">{formatDate(user.createdAt)}</td>
                    <td className="px-4 py-3">
                      <span className={`flex items-center gap-1 w-fit text-2xs font-medium px-2 py-0.5 rounded ${
                        user.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${user.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                        {user.isActive ? 'Attivo' : 'Disattivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => setModalUser(user)}
                          className="p-1.5 text-gray-400 hover:text-primary hover:bg-cream rounded transition-colors"
                          title="Modifica"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => handleToggleActive(user)}
                          disabled={togglingId === user.id || user.id === currentUserId}
                          className="p-1.5 text-gray-400 hover:text-primary hover:bg-cream rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          title={user.isActive ? 'Disattiva' : 'Attiva'}
                        >
                          <Power size={13} />
                        </button>
                        {confirmDeleteId === user.id ? (
                          <span className="flex items-center gap-1">
                            <button
                              onClick={() => handleDelete(user.id)}
                              disabled={deletingId === user.id}
                              className="text-2xs px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
                            >
                              {deletingId === user.id ? '...' : 'Conferma'}
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="text-2xs px-2 py-1 border border-border rounded hover:bg-cream text-gray-500"
                            >
                              No
                            </button>
                          </span>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteId(user.id)}
                            disabled={user.id === currentUserId}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Elimina"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Role legend */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(Object.keys(ROLE_LABELS) as AdminRole[]).map((r) => (
            <div key={r} className="bg-white border border-border rounded p-3 flex items-start gap-3">
              <span className={`mt-0.5 text-2xs font-semibold px-2 py-0.5 rounded flex-shrink-0 ${ROLE_BADGE[r]}`}>
                {ROLE_LABELS[r]}
              </span>
              <p className="text-2xs text-gray-500">{ROLE_DESC[r]}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Modal */}
      {modalUser !== undefined && (
        <UserModal
          user={modalUser ?? undefined}
          onClose={() => setModalUser(undefined)}
          onSaved={() => qc.invalidateQueries({ queryKey: ['admin-users'] })}
        />
      )}
    </div>
  );
}
