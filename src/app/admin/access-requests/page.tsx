'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Check } from 'lucide-react';
import toast from 'react-hot-toast';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface AccessRequest {
  id: string;
  organizzazione: string;
  puntoVendita: string;
  nomeResponsabile: string;
  email: string;
  status: string;
  createdAt: string;
}

export default function AccessRequestsPage() {
  const queryClient = useQueryClient();

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

  async function markHandled(id: string) {
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
              <th className="py-3 px-4 w-24" />
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
                  <a href={`mailto:${r.email}`} className="text-accent hover:underline">
                    {r.email}
                  </a>
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
                    <button
                      onClick={() => markHandled(r.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-2xs font-medium text-green-700 border border-green-200 rounded hover:bg-green-50 transition-colors"
                    >
                      <Check size={11} />
                      Gestita
                    </button>
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
    </div>
  );
}
