'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Check, UserPlus, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';

interface AccessRequest {
  id: string;
  organizzazione: string;
  puntoVendita: string;
  nomeResponsabile: string;
  email: string;
  status: string;
  createdAt: string;
}

interface CreatedAccount {
  companyName: string;
  email: string;
  customerCode: string;
  password: string;
}

export default function AccessRequestsPage() {
  const queryClient = useQueryClient();
  const [creatingId, setCreatingId] = useState<string | null>(null);
  const [markingId, setMarkingId]   = useState<string | null>(null);
  const [createdAccount, setCreatedAccount] = useState<CreatedAccount | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['access-requests'],
    queryFn: async () => {
      const res = await fetch('/api/access-requests');
      if (!res.ok) throw new Error('Failed');
      return res.json() as Promise<{ data: AccessRequest[] }>;
    },
  });

  const requests = data?.data || [];
  const pending = requests.filter((r) => r.status === 'pending');
  const handled = requests.filter((r) => r.status !== 'pending');

  async function handleCreateAccount(req: AccessRequest) {
    setCreatingId(req.id);
    try {
      const res = await fetch(`/api/access-requests/${req.id}/create-account`, {
        method: 'POST',
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Errore');
      }
      const { data } = await res.json();
      setCreatedAccount(data);
      await queryClient.invalidateQueries({ queryKey: ['access-requests'] });
    } catch (err: any) {
      toast.error(err.message || 'Impossibile creare l\'account');
    } finally {
      setCreatingId(null);
    }
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

  function RequestTable({ items, dimmed }: { items: AccessRequest[]; dimmed?: boolean }) {
    if (items.length === 0) return null;
    return (
      <div className={`bg-white border border-border rounded overflow-hidden ${dimmed ? 'opacity-50' : ''}`}>
        <table className="table-luxury w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-cream">
              <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
              <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Organizzazione</th>
              <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Punto vendita</th>
              <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Responsabile</th>
              <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stato</th>
              <th className="py-3 px-4 w-48" />
            </tr>
          </thead>
          <tbody>
            {items.map((r) => (
              <tr key={r.id} className="border-b border-border last:border-0">
                <td className="py-3 px-4 text-gray-500 whitespace-nowrap">
                  {format(new Date(r.createdAt), 'd MMM yyyy', { locale: it })}
                </td>
                <td className="py-3 px-4 font-medium text-primary">{r.organizzazione}</td>
                <td className="py-3 px-4 text-gray-600">{r.puntoVendita}</td>
                <td className="py-3 px-4 text-gray-600">{r.nomeResponsabile}</td>
                <td className="py-3 px-4">
                  <a href={`mailto:${r.email}`} className="text-accent hover:underline">{r.email}</a>
                </td>
                <td className="py-3 px-4">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-2xs font-medium ${
                    r.status === 'pending'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-green-50 text-green-700 border border-green-200'
                  }`}>
                    {r.status === 'pending' ? 'In attesa' : 'Gestita'}
                  </span>
                </td>
                <td className="py-3 px-4 text-right">
                  {r.status === 'pending' && (
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleCreateAccount(r)}
                        disabled={creatingId === r.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-2xs font-medium bg-primary text-white rounded hover:bg-primary/90 transition-colors disabled:opacity-50"
                      >
                        <UserPlus size={11} />
                        {creatingId === r.id ? 'Creando…' : 'Crea account'}
                      </button>
                      <button
                        onClick={() => markHandled(r.id)}
                        disabled={markingId === r.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-2xs font-medium text-green-700 border border-green-200 rounded hover:bg-green-50 transition-colors disabled:opacity-50"
                        title="Segna come gestita senza creare account"
                      >
                        <Check size={11} />
                        Gestita
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <p className="label-luxury text-accent mb-1">Admin</p>
        <h1 className="font-display text-2xl text-primary font-light">Richieste Accesso</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          {requests.length} richiest{requests.length === 1 ? 'a' : 'e'} totali
          {pending.length > 0 && (
            <span className="ml-2 text-amber-600 font-medium">· {pending.length} in attesa</span>
          )}
        </p>
      </div>

      {isLoading ? (
        <div className="py-20 flex justify-center"><LoadingSpinner /></div>
      ) : requests.length === 0 ? (
        <div className="py-20 text-center text-gray-400 text-sm">Nessuna richiesta ricevuta.</div>
      ) : (
        <div className="space-y-8">
          {pending.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">In attesa</p>
              <RequestTable items={pending} />
            </div>
          )}
          {handled.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Gestite</p>
              <RequestTable items={handled} dimmed />
            </div>
          )}
        </div>
      )}

      {/* Account created — one-time credentials reveal */}
      <Modal
        isOpen={!!createdAccount}
        onClose={() => setCreatedAccount(null)}
        title="Account creato"
        size="sm"
        footer={
          <Button onClick={() => setCreatedAccount(null)}>Ho preso nota, chiudi</Button>
        }
      >
        {createdAccount && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Account creato con successo per{' '}
              <span className="font-semibold text-primary">{createdAccount.companyName}</span>.
            </p>

            <div className="bg-cream border border-border rounded divide-y divide-border/60">
              {[
                { label: 'Email',            value: createdAccount.email },
                { label: 'Codice cliente',   value: createdAccount.customerCode },
                { label: 'Password',         value: createdAccount.password, bold: true },
              ].map(({ label, value, bold }) => (
                <div key={label} className="flex items-center justify-between px-4 py-2.5">
                  <div>
                    <p className="text-2xs text-gray-400 uppercase tracking-wider">{label}</p>
                    <p className={`font-mono text-sm mt-0.5 ${bold ? 'font-bold text-primary' : 'text-gray-700'}`}>
                      {value}
                    </p>
                  </div>
                  <button
                    onClick={() => { navigator.clipboard.writeText(value); toast.success('Copiato'); }}
                    className="text-gray-300 hover:text-primary transition-colors ml-3"
                    title="Copia"
                  >
                    <Copy size={13} />
                  </button>
                </div>
              ))}
            </div>

            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
              Comunica queste credenziali al cliente. La password non sarà più visualizzabile.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
