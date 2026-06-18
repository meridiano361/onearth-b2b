'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { ArrowLeft, Search, Download, Star, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';

const SURVEY_SLUG = 'recensione-app-giugno-2026';

interface Survey {
  id: string;
  slug: string;
}

interface ResponseRow {
  id: string;
  submittedAt: string;
  sourceChannel: string | null;
  customer: { id: string; companyName: string; email: string; customerCode: string };
  soddisfazione: number | null;
  facilitaUso: number | null;
  sezioniUtili: string[] | null;
  prenotazioniFuture: string | null;
  usoDemetra: string | null;
  suggerimento: string | null;
}

export default function AdminRecensioniRispostePage() {
  const [search, setSearch] = useState('');
  const [filterPrenotazioni, setFilterPrenotazioni] = useState('');
  const [filterDemetra, setFilterDemetra] = useState('');
  const [filterLowRating, setFilterLowRating] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: surveysData } = useQuery<{ surveys: Survey[] }>({
    queryKey: ['admin-surveys'],
    queryFn: () => fetch('/api/admin/surveys').then((r) => r.json()),
    staleTime: 60_000,
  });
  const survey = surveysData?.surveys?.find((s) => s.slug === SURVEY_SLUG) ?? surveysData?.surveys?.[0];

  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (filterPrenotazioni) params.set('prenotazioni', filterPrenotazioni);
  if (filterDemetra) params.set('demetra', filterDemetra);
  if (filterLowRating) params.set('lowRating', '1');

  const { data, isLoading } = useQuery<{ responses: ResponseRow[] }>({
    queryKey: ['admin-survey-responses', survey?.id, search, filterPrenotazioni, filterDemetra, filterLowRating],
    queryFn: () => fetch(`/api/admin/surveys/${survey!.id}/responses?${params}`).then((r) => r.json()),
    enabled: !!survey?.id,
    staleTime: 30_000,
  });

  const responses = data?.responses ?? [];

  const selectClass = 'h-8 border border-border rounded px-2 text-xs text-primary bg-white focus:outline-none focus:ring-1 focus:ring-accent';

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <Link href="/admin/recensioni" className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors mb-3">
            <ArrowLeft size={13} /> Panoramica
          </Link>
          <p className="label-luxury text-accent mb-1">Admin · Recensioni</p>
          <h1 className="font-display text-2xl text-primary font-light">Risposte</h1>
          <p className="text-sm text-gray-400 mt-0.5">{responses.length} risposte</p>
        </div>
        {survey && (
          <a
            href={`/api/admin/surveys/${survey.id}/export`}
            className="flex items-center gap-1.5 px-3 py-2 border border-border rounded text-xs text-gray-600 hover:bg-cream transition-colors"
          >
            <Download size={13} />
            Esporta CSV
          </a>
        )}
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-2 items-center">
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cliente, email, suggerimento..."
            className="h-8 pl-8 pr-3 border border-border rounded text-xs text-primary bg-white focus:outline-none focus:ring-1 focus:ring-accent w-56"
          />
        </div>
        <select value={filterPrenotazioni} onChange={(e) => setFilterPrenotazioni(e.target.value)} className={selectClass}>
          <option value="">Prenotazioni: Tutte</option>
          <option value="Sì">Sì</option>
          <option value="No">No</option>
        </select>
        <select value={filterDemetra} onChange={(e) => setFilterDemetra(e.target.value)} className={selectClass}>
          <option value="">Demetra: Tutti</option>
          <option value="Sì">Sì</option>
          <option value="No">No</option>
          <option value="In parte">In parte</option>
        </select>
        <button
          onClick={() => setFilterLowRating(!filterLowRating)}
          className={`h-8 px-3 text-xs rounded border transition-colors ${filterLowRating ? 'border-amber-400 bg-amber-50 text-amber-700 font-medium' : 'border-border text-gray-600 hover:bg-cream'}`}
        >
          ★ Basso (1–2)
        </button>
      </div>

      {isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 size={24} className="animate-spin text-gray-400" />
        </div>
      )}

      {!isLoading && (
        <div className="bg-white border border-border rounded overflow-hidden overflow-x-auto">
          <table className="w-full min-w-[900px] text-xs">
            <thead className="bg-gray-50 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Data</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Cliente</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Canale</th>
                <th className="text-center px-3 py-3 text-gray-500 font-medium">Sodd.</th>
                <th className="text-center px-3 py-3 text-gray-500 font-medium">Facilità</th>
                <th className="text-left px-3 py-3 text-gray-500 font-medium">Sezioni</th>
                <th className="text-center px-3 py-3 text-gray-500 font-medium">Prenotaz.</th>
                <th className="text-center px-3 py-3 text-gray-500 font-medium">Demetra</th>
                <th className="text-left px-3 py-3 text-gray-500 font-medium w-40">Suggerimento</th>
                <th className="w-8 px-2"></th>
              </tr>
            </thead>
            <tbody>
              {responses.length === 0 ? (
                <tr><td colSpan={10} className="py-12 text-center text-gray-400">Nessuna risposta</td></tr>
              ) : (
                responses.map((r) => (
                  <>
                    <tr
                      key={r.id}
                      className="border-b border-border/50 hover:bg-gray-50/50 cursor-pointer"
                      onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                    >
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {new Date(r.submittedAt).toLocaleDateString('it-IT')}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-primary">{r.customer.companyName}</p>
                        <p className="text-gray-400 text-2xs">{r.customer.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <ChannelBadge channel={r.sourceChannel} />
                      </td>
                      <td className="px-3 py-3 text-center">
                        <StarBadge value={r.soddisfazione} />
                      </td>
                      <td className="px-3 py-3 text-center">
                        <StarBadge value={r.facilitaUso} />
                      </td>
                      <td className="px-3 py-3 max-w-[120px]">
                        <span className="truncate block text-gray-600">
                          {Array.isArray(r.sezioniUtili) ? r.sezioniUtili.join(', ') : '—'}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center text-gray-600">{r.prenotazioniFuture ?? '—'}</td>
                      <td className="px-3 py-3 text-center text-gray-600">{r.usoDemetra ?? '—'}</td>
                      <td className="px-3 py-3 max-w-[160px]">
                        <span className="truncate block text-gray-500">
                          {r.suggerimento ? `"${r.suggerimento}"` : '—'}
                        </span>
                      </td>
                      <td className="px-2 py-3 text-gray-400">
                        {expandedId === r.id ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      </td>
                    </tr>
                    {expandedId === r.id && (
                      <tr key={r.id + '-expanded'} className="bg-gray-50/80">
                        <td colSpan={10} className="px-6 py-4">
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-2xl">
                            <Detail label="Cliente" value={`${r.customer.companyName} (${r.customer.customerCode})`} />
                            <Detail label="Email" value={r.customer.email} />
                            <Detail label="Canale" value={r.sourceChannel ?? '—'} />
                            <Detail label="Soddisfazione" value={r.soddisfazione ? `${r.soddisfazione}/5` : '—'} />
                            <Detail label="Facilità d'uso" value={r.facilitaUso ? `${r.facilitaUso}/5` : '—'} />
                            <Detail label="Sezioni utili" value={Array.isArray(r.sezioniUtili) ? r.sezioniUtili.join(', ') : '—'} />
                            <Detail label="Prenotazioni future" value={r.prenotazioniFuture ?? '—'} />
                            <Detail label="Uso Demetra" value={r.usoDemetra ?? '—'} />
                            {r.suggerimento && (
                              <div className="col-span-2 sm:col-span-3">
                                <p className="text-2xs text-gray-400 uppercase tracking-widest mb-1">Suggerimento</p>
                                <p className="text-sm text-gray-700 leading-relaxed italic">"{r.suggerimento}"</p>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StarBadge({ value }: { value: number | null }) {
  if (!value) return <span className="text-gray-300">—</span>;
  const color = value >= 4 ? 'text-emerald-600' : value >= 3 ? 'text-amber-600' : 'text-red-500';
  return (
    <span className={`font-semibold ${color} flex items-center justify-center gap-0.5`}>
      <Star size={10} className={`fill-current`} />
      {value}
    </span>
  );
}

function ChannelBadge({ channel }: { channel: string | null }) {
  const map: Record<string, { label: string; cls: string }> = {
    email: { label: 'Email', cls: 'bg-blue-50 text-blue-700' },
    push: { label: 'Push', cls: 'bg-purple-50 text-purple-700' },
    in_app: { label: 'App', cls: 'bg-gray-100 text-gray-600' },
  };
  const style = map[channel ?? ''] ?? { label: channel ?? '—', cls: 'bg-gray-100 text-gray-500' };
  return <span className={`text-2xs font-medium px-2 py-0.5 rounded-full ${style.cls}`}>{style.label}</span>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-2xs text-gray-400 uppercase tracking-widest mb-0.5">{label}</p>
      <p className="text-xs text-gray-700">{value}</p>
    </div>
  );
}
