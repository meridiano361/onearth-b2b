'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { ArrowLeft, Search, Loader2, Mail, Bell, CheckCircle, Clock, Eye } from 'lucide-react';

interface Recipient {
  id: string;
  email: string;
  respondentName: string | null;
  pushSentAt: string | null;
  emailSentAt: string | null;
  openedAt: string | null;
  completedAt: string | null;
  status: string;
  deliveryChannel: string | null;
}

const FILTERS = [
  { value: 'all', label: 'Tutti' },
  { value: 'email', label: 'Email inviata' },
  { value: 'push', label: 'Push inviato' },
  { value: 'pending', label: 'Non inviati' },
  { value: 'completed', label: 'Completati' },
];

const STATUS_LABEL: Record<string, string> = {
  pending: 'In attesa',
  sent: 'Inviato',
  opened: 'Aperto',
  started: 'Iniziato',
  completed: 'Completato',
};

const STATUS_CLASS: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-500',
  sent: 'bg-blue-50 text-blue-600',
  opened: 'bg-amber-50 text-amber-600',
  started: 'bg-orange-50 text-orange-600',
  completed: 'bg-emerald-50 text-emerald-700',
};

function fmt(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function AdminSondaggiDestinatariPage({ surveyId }: { surveyId: string }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const { data: surveyData } = useQuery<{ survey: { title: string } }>({
    queryKey: ['admin-survey-meta', surveyId],
    queryFn: () => fetch(`/api/admin/surveys/${surveyId}`).then((r) => r.json()),
    staleTime: 60_000,
  });

  const params = new URLSearchParams({ filter });
  if (search) params.set('search', search);

  const { data, isLoading } = useQuery<{ recipients: Recipient[] }>({
    queryKey: ['admin-survey-recipients', surveyId, filter, search],
    queryFn: () => fetch(`/api/admin/surveys/${surveyId}/recipients?${params}`).then((r) => r.json()),
    staleTime: 30_000,
  });

  const recipients = data?.recipients ?? [];

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <Link href={`/admin/sondaggi/${surveyId}`} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors mb-2">
            <ArrowLeft size={13} /> Panoramica
          </Link>
          <p className="label-luxury text-accent mb-1">Sondaggi</p>
          <h1 className="font-display text-2xl text-primary font-light">Destinatari</h1>
          {surveyData?.survey && <p className="text-xs text-gray-400 mt-0.5">{surveyData.survey.title}</p>}
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-2 items-center">
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca per nome o email..."
            className="h-8 pl-8 pr-3 border border-border rounded text-xs text-primary bg-white focus:outline-none focus:ring-1 focus:ring-accent w-56"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`h-8 px-3 text-xs rounded border transition-colors ${filter === f.value ? 'border-black bg-black text-white' : 'border-border text-gray-600 hover:bg-cream'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <span className="text-xs text-gray-400 ml-auto">{recipients.length} destinatari</span>
      </div>

      {isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 size={24} className="animate-spin text-gray-400" />
        </div>
      )}

      {!isLoading && (
        <div className="bg-white border border-border rounded overflow-hidden overflow-x-auto">
          <table className="w-full min-w-[640px] text-xs">
            <thead className="bg-gray-50 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Destinatario</th>
                <th className="text-center px-3 py-3 text-gray-500 font-medium">
                  <span className="flex items-center justify-center gap-1"><Mail size={11} /> Email</span>
                </th>
                <th className="text-center px-3 py-3 text-gray-500 font-medium">
                  <span className="flex items-center justify-center gap-1"><Bell size={11} /> Push</span>
                </th>
                <th className="text-center px-3 py-3 text-gray-500 font-medium">
                  <span className="flex items-center justify-center gap-1"><Eye size={11} /> Aperto</span>
                </th>
                <th className="text-center px-3 py-3 text-gray-500 font-medium">Stato</th>
              </tr>
            </thead>
            <tbody>
              {recipients.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-400">Nessun destinatario</td>
                </tr>
              ) : (
                recipients.map((r) => (
                  <tr key={r.id} className="border-b border-border/50 hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-primary">{r.respondentName ?? '—'}</p>
                      <p className="text-gray-400 text-2xs">{r.email}</p>
                    </td>
                    <td className="px-3 py-3 text-center">
                      {r.emailSentAt ? (
                        <div className="flex flex-col items-center gap-0.5">
                          <CheckCircle size={13} className="text-emerald-500" />
                          <span className="text-2xs text-gray-400">{fmt(r.emailSentAt)}</span>
                        </div>
                      ) : (
                        <Clock size={13} className="text-gray-300 mx-auto" />
                      )}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {r.pushSentAt ? (
                        <div className="flex flex-col items-center gap-0.5">
                          <CheckCircle size={13} className="text-emerald-500" />
                          <span className="text-2xs text-gray-400">{fmt(r.pushSentAt)}</span>
                        </div>
                      ) : (
                        <Clock size={13} className="text-gray-300 mx-auto" />
                      )}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {r.openedAt ? (
                        <div className="flex flex-col items-center gap-0.5">
                          <CheckCircle size={13} className="text-blue-500" />
                          <span className="text-2xs text-gray-400">{fmt(r.openedAt)}</span>
                        </div>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={`text-2xs font-medium px-2 py-0.5 rounded-full ${STATUS_CLASS[r.status] ?? STATUS_CLASS.pending}`}>
                        {STATUS_LABEL[r.status] ?? r.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
