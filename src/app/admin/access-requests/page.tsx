'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Check, UserPlus, Trash2, Search, Loader2, X, Eye, EyeOff, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface AccessRequest {
  id: string;
  organizzazione: string;
  nome?: string | null;
  cognome?: string | null;
  telefono?: string | null;
  email: string;
  status: string;
  createdAt: string;
}

function genPassword(orgNome: string) {
  const letters = orgNome.toLowerCase().replace(/[^a-z]/g, '').slice(0, 5);
  return `onearth_${letters}`;
}

const FILTER_TABS = [
  { key: 'all',     label: 'Tutte' },
  { key: 'pending', label: 'In attesa' },
  { key: 'handled', label: 'Gestite' },
] as const;

type FilterKey = (typeof FILTER_TABS)[number]['key'];

export default function AccessRequestsPage() {
  const queryClient = useQueryClient();

  // Filters
  const [filter, setFilter] = useState<FilterKey>('all');
  const [search, setSearch] = useState('');

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Bulk actions
  const [isBulkWorking, setIsBulkWorking] = useState(false);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

  // Per-row actions
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Create operator modal
  const [createReq, setCreateReq] = useState<AccessRequest | null>(null);
  const [createForm, setCreateForm] = useState({
    orgNome: '', nome: '', cognome: '', email: '', telefono: '', password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['access-requests'],
    queryFn: async () => {
      const res = await fetch('/api/access-requests');
      if (!res.ok) throw new Error('Failed');
      return res.json() as Promise<{ data: AccessRequest[] }>;
    },
  });

  const requests = data?.data ?? [];

  const filtered = useMemo(() => {
    let list = requests;
    if (filter === 'pending') list = list.filter((r) => r.status === 'pending');
    if (filter === 'handled') list = list.filter((r) => r.status !== 'pending');
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.nome?.toLowerCase().includes(s) ||
          r.cognome?.toLowerCase().includes(s) ||
          r.email.toLowerCase().includes(s) ||
          r.organizzazione.toLowerCase().includes(s)
      );
    }
    return list;
  }, [requests, filter, search]);

  const allSelected = filtered.length > 0 && filtered.every((r) => selected.has(r.id));
  const someSelected = selected.size > 0;
  const pendingCount = requests.filter((r) => r.status === 'pending').length;

  function toggleAll() {
    if (allSelected) {
      setSelected((s) => { const n = new Set(s); filtered.forEach((r) => n.delete(r.id)); return n; });
    } else {
      setSelected((s) => { const n = new Set(s); filtered.forEach((r) => n.add(r.id)); return n; });
    }
  }

  function toggleOne(id: string) {
    setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  async function markHandled(id: string) {
    setMarkingId(id);
    try {
      const res = await fetch(`/api/access-requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'gestita' }),
      });
      if (!res.ok) throw new Error();
      await queryClient.invalidateQueries({ queryKey: ['access-requests'] });
      toast.success('Richiesta segnata come gestita');
    } catch {
      toast.error('Impossibile aggiornare la richiesta');
    } finally {
      setMarkingId(null);
    }
  }

  async function deleteSingle(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/access-requests/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setSelected((s) => { const n = new Set(s); n.delete(id); return n; });
      await queryClient.invalidateQueries({ queryKey: ['access-requests'] });
      toast.success('Richiesta eliminata');
    } catch {
      toast.error('Impossibile eliminare la richiesta');
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  }

  async function bulkMarkGestita() {
    setIsBulkWorking(true);
    try {
      const ids = Array.from(selected).filter((id) => {
        const r = requests.find((x) => x.id === id);
        return r?.status === 'pending';
      });
      await Promise.all(
        ids.map((id) =>
          fetch(`/api/access-requests/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'gestita' }),
          })
        )
      );
      setSelected(new Set());
      await queryClient.invalidateQueries({ queryKey: ['access-requests'] });
      toast.success(`${ids.length} richiest${ids.length === 1 ? 'a' : 'e'} segnate come gestite`);
    } catch {
      toast.error('Errore durante l\'operazione');
    } finally {
      setIsBulkWorking(false);
    }
  }

  async function bulkDelete() {
    setIsBulkWorking(true);
    try {
      const ids = Array.from(selected);
      await Promise.all(ids.map((id) => fetch(`/api/access-requests/${id}`, { method: 'DELETE' })));
      setSelected(new Set());
      setConfirmBulkDelete(false);
      await queryClient.invalidateQueries({ queryKey: ['access-requests'] });
      toast.success(`${ids.length} richiest${ids.length === 1 ? 'a' : 'e'} eliminate`);
    } catch {
      toast.error('Errore durante l\'eliminazione');
    } finally {
      setIsBulkWorking(false);
    }
  }

  // Auto-populate create form when a request is selected
  useEffect(() => {
    if (createReq) {
      setCreateForm({
        orgNome: createReq.organizzazione,
        nome: createReq.nome ?? '',
        cognome: createReq.cognome ?? '',
        email: createReq.email,
        telefono: createReq.telefono ?? '',
        password: genPassword(createReq.organizzazione),
      });
      setShowPassword(false);
    }
  }, [createReq]);

  async function handleCreateOperator() {
    if (!createReq) return;
    setIsCreating(true);
    try {
      const res = await fetch(`/api/access-requests/${createReq.id}/create-operator`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Errore');
      await queryClient.invalidateQueries({ queryKey: ['access-requests'] });
      setCreateReq(null);
      toast.success(`Account creato. Password: ${createForm.password}`);
    } catch (err: any) {
      toast.error(err.message || 'Impossibile creare l\'account');
    } finally {
      setIsCreating(false);
    }
  }

  const inputCls = 'w-full px-3 py-2 bg-white border border-border rounded text-sm text-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 placeholder-gray-400';

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <p className="label-luxury text-accent mb-1">Admin</p>
        <h1 className="font-display text-2xl text-primary font-light">Richieste Accesso</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          {requests.length} richiest{requests.length === 1 ? 'a' : 'e'} totali
          {pendingCount > 0 && (
            <span className="ml-2 text-amber-600 font-medium">· {pendingCount} in attesa</span>
          )}
        </p>
      </div>

      {/* Filters + search */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex gap-0.5 bg-cream rounded-lg p-0.5 self-start">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                filter === tab.key
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-gray-500 hover:text-primary'
              }`}
            >
              {tab.label}
              {tab.key === 'pending' && pendingCount > 0 && (
                <span className="ml-1.5 bg-amber-100 text-amber-700 text-2xs px-1.5 py-0.5 rounded-full">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca per nome, email, org…"
            className="w-full pl-8 pr-3 py-1.5 text-sm bg-white border border-border rounded focus:outline-none focus:border-accent"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Bulk action bar */}
      {someSelected && (
        <div className="flex items-center gap-3 flex-wrap mb-4 px-3 py-2.5 bg-primary/5 border border-primary/10 rounded-lg">
          <span className="text-xs font-medium text-primary">
            {selected.size} richiest{selected.size === 1 ? 'a' : 'e'} selezionat{selected.size === 1 ? 'a' : 'e'}
          </span>
          <div className="flex items-center gap-2 ml-auto flex-wrap">
            <button
              onClick={bulkMarkGestita}
              disabled={isBulkWorking}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-700 border border-green-200 rounded hover:bg-green-50 transition-colors disabled:opacity-50"
            >
              {isBulkWorking ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
              Segna come gestite
            </button>
            <button
              onClick={() => setConfirmBulkDelete(true)}
              disabled={isBulkWorking}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 border border-red-200 rounded hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              <Trash2 size={11} />
              Elimina selezionate
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Deseleziona tutte
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="py-20 flex justify-center"><LoadingSpinner /></div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center text-gray-400 text-sm">
          {search ? 'Nessun risultato per la ricerca.' : 'Nessuna richiesta.'}
        </div>
      ) : (
        <div className="bg-white border border-border rounded overflow-hidden overflow-x-auto">
          <table className="table-luxury w-full text-sm min-w-[800px]">
            <thead>
              <tr className="border-b border-border bg-cream">
                <th className="py-3 px-4 w-8">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="rounded border-gray-300 text-accent focus:ring-accent"
                  />
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Data</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Organizzazione</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cognome</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Telefono</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stato</th>
                <th className="py-3 px-4 w-48" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className={`border-b border-border last:border-0 ${selected.has(r.id) ? 'bg-accent/5' : ''}`}>
                  <td className="py-3 px-4">
                    <input
                      type="checkbox"
                      checked={selected.has(r.id)}
                      onChange={() => toggleOne(r.id)}
                      className="rounded border-gray-300 text-accent focus:ring-accent"
                    />
                  </td>
                  <td className="py-3 px-4 text-gray-500 whitespace-nowrap text-xs">
                    {format(new Date(r.createdAt), 'd MMM yyyy', { locale: it })}
                  </td>
                  <td className="py-3 px-4 font-medium text-primary max-w-[140px]">
                    <span className="line-clamp-1">{r.organizzazione}</span>
                  </td>
                  <td className="py-3 px-4 text-gray-600">{r.nome || '—'}</td>
                  <td className="py-3 px-4 text-gray-600">{r.cognome || '—'}</td>
                  <td className="py-3 px-4">
                    <a href={`mailto:${r.email}`} className="text-accent hover:underline text-xs">{r.email}</a>
                  </td>
                  <td className="py-3 px-4 text-gray-600 text-xs">{r.telefono || '—'}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-2xs font-medium ${
                      r.status === 'pending'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-green-50 text-green-700 border border-green-200'
                    }`}>
                      {r.status === 'pending' ? 'In attesa' : 'Gestita'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-1.5">
                      {r.status === 'pending' && (
                        <>
                          <button
                            onClick={() => setCreateReq(r)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-2xs font-medium bg-primary text-white rounded hover:bg-primary/90 transition-colors whitespace-nowrap"
                          >
                            <UserPlus size={10} />
                            Crea account
                          </button>
                          <button
                            onClick={() => markHandled(r.id)}
                            disabled={markingId === r.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-2xs font-medium text-green-700 border border-green-200 rounded hover:bg-green-50 transition-colors disabled:opacity-50"
                            title="Segna come gestita"
                          >
                            {markingId === r.id ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />}
                          </button>
                        </>
                      )}
                      {confirmDeleteId === r.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => deleteSingle(r.id)}
                            disabled={deletingId === r.id}
                            className="text-2xs text-red-600 font-medium hover:text-red-700 disabled:opacity-50"
                          >
                            {deletingId === r.id ? <Loader2 size={10} className="animate-spin" /> : 'Sì'}
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="text-2xs text-gray-400 hover:text-gray-600"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(r.id)}
                          className="p-1.5 text-gray-300 hover:text-red-500 rounded hover:bg-red-50 transition-colors"
                          title="Elimina"
                        >
                          <Trash2 size={12} />
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

      {/* Create operator modal */}
      {createReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !isCreating && setCreateReq(null)} />
          <div className="relative bg-white rounded-lg shadow-2xl w-full max-w-md p-6 z-10 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setCreateReq(null)}
              disabled={isCreating}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 disabled:opacity-50"
            >
              <X size={16} />
            </button>
            <div className="mb-5">
              <h3 className="text-sm font-semibold text-primary tracking-wide">Crea organizzazione e operatore</h3>
              <p className="text-xs text-gray-400 mt-0.5">Verifica i dati pre-compilati dalla richiesta</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Organizzazione</label>
                <input
                  value={createForm.orgNome}
                  onChange={(e) => setCreateForm((f) => ({ ...f, orgNome: e.target.value, password: genPassword(e.target.value) }))}
                  className={inputCls}
                  placeholder="Nome organizzazione"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Nome</label>
                  <input
                    value={createForm.nome}
                    onChange={(e) => setCreateForm((f) => ({ ...f, nome: e.target.value }))}
                    className={inputCls}
                    placeholder="Nome"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Cognome</label>
                  <input
                    value={createForm.cognome}
                    onChange={(e) => setCreateForm((f) => ({ ...f, cognome: e.target.value }))}
                    className={inputCls}
                    placeholder="Cognome"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Email</label>
                <input
                  value={createForm.email}
                  onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                  type="email"
                  className={inputCls}
                  placeholder="email@esempio.com"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Telefono</label>
                <input
                  value={createForm.telefono}
                  onChange={(e) => setCreateForm((f) => ({ ...f, telefono: e.target.value }))}
                  className={inputCls}
                  placeholder="Opzionale"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Password</label>
                <div className="relative">
                  <input
                    value={createForm.password}
                    onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
                    type={showPassword ? 'text' : 'password'}
                    className={inputCls + ' pr-10 font-mono'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                {showPassword && (
                  <div className="mt-1.5 flex items-center gap-1.5 p-2 bg-amber-50 border border-amber-200 rounded">
                    <span className="font-mono text-xs font-bold text-primary">{createForm.password}</span>
                    <button
                      type="button"
                      onClick={() => { navigator.clipboard.writeText(createForm.password); toast.success('Copiata'); }}
                      className="ml-auto text-gray-400 hover:text-primary"
                    >
                      <Copy size={11} />
                    </button>
                  </div>
                )}
                <p className="text-2xs text-gray-400 mt-1">Generata automaticamente · comunicala al cliente</p>
              </div>
            </div>

            <button
              onClick={handleCreateOperator}
              disabled={isCreating || !createForm.orgNome || !createForm.nome || !createForm.cognome || !createForm.email || !createForm.password}
              className="mt-5 w-full py-2.5 text-xs font-medium rounded bg-primary text-background hover:bg-warm-darker transition-colors flex items-center justify-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isCreating ? (
                <><Loader2 size={12} className="animate-spin" /> Creazione in corso…</>
              ) : (
                <><UserPlus size={12} /> Crea organizzazione e operatore</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Bulk delete confirmation */}
      {confirmBulkDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !isBulkWorking && setConfirmBulkDelete(false)} />
          <div className="relative bg-white rounded-lg shadow-2xl w-full max-w-sm p-6 z-10">
            <h3 className="text-sm font-semibold text-primary mb-2">Eliminare {selected.size} richiest{selected.size === 1 ? 'a' : 'e'}?</h3>
            <p className="text-xs text-gray-500 mb-5">Questa operazione è irreversibile.</p>
            <div className="flex items-center gap-3">
              <button
                onClick={bulkDelete}
                disabled={isBulkWorking}
                className="flex-1 py-2.5 text-xs font-medium rounded bg-red-600 text-white hover:bg-red-700 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-60"
              >
                {isBulkWorking ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                Elimina
              </button>
              <button
                onClick={() => setConfirmBulkDelete(false)}
                disabled={isBulkWorking}
                className="flex-1 py-2.5 text-xs font-medium rounded border border-border text-gray-600 hover:bg-cream transition-colors"
              >
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
