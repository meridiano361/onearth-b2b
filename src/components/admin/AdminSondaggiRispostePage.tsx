'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Search, Download, Star, ChevronDown, ChevronUp,
  Loader2, Trash2, MessageSquare, List,
} from 'lucide-react';

interface Question { key: string; text: string; type: string }
interface ResponseRow {
  id: string;
  submittedAt: string;
  sourceChannel: string | null;
  respondentName: string;
  email: string;
  customerCode: string | null;
  organizationName: string | null;
  answers: Record<string, unknown>;
}
interface ResponsesData { questions: Question[]; responses: ResponseRow[] }

function formatAnswer(value: unknown, type: string): string {
  if (value === null || value === undefined) return '—';
  if (Array.isArray(value)) return value.join(', ');
  if (type === 'stars' && typeof value === 'number') return `${value}/5`;
  return String(value);
}

export default function AdminSondaggiRispostePage({ surveyId }: { surveyId: string }) {
  const [search, setSearch] = useState('');
  const [ratingFilter, setRatingFilter] = useState<'low' | 'mid' | 'high' | null>(null);
  const [filterHasComment, setFilterHasComment] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'comments'>('table');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data: surveyData } = useQuery<{ survey: { title: string } }>({
    queryKey: ['admin-survey-meta', surveyId],
    queryFn: () => fetch(`/api/admin/surveys/${surveyId}`).then((r) => r.json()),
    staleTime: 60_000,
  });

  const params = new URLSearchParams();
  if (search) params.set('search', search);

  const { data, isLoading } = useQuery<ResponsesData>({
    queryKey: ['admin-survey-responses', surveyId, search],
    queryFn: () => fetch(`/api/admin/surveys/${surveyId}/responses?${params}`).then((r) => r.json()),
    staleTime: 30_000,
  });

  const questions = data?.questions ?? [];
  const starQuestions = questions.filter((q) => q.type === 'stars').slice(0, 3);
  const textQuestions = questions.filter((q) => q.type === 'text');

  const hasComment = (r: ResponseRow) =>
    textQuestions.some((q) => typeof r.answers[q.key] === 'string' && (r.answers[q.key] as string).trim().length > 0);

  let responses = data?.responses ?? [];
  if (ratingFilter) {
    responses = responses.filter((r) =>
      starQuestions.some((q) => {
        const v = r.answers[q.key];
        if (typeof v !== 'number') return false;
        if (ratingFilter === 'low') return v <= 2;
        if (ratingFilter === 'mid') return v === 3 || v === 4;
        return v === 5;
      })
    );
  }
  if (filterHasComment) {
    responses = responses.filter(hasComment);
  }

  const allComments = (data?.responses ?? []).filter(hasComment);

  async function handleDelete(responseId: string, name: string) {
    if (!confirm(`Eliminare la risposta di "${name}"? L'operazione non è reversibile.`)) return;
    setDeletingId(responseId);
    try {
      const res = await fetch(`/api/admin/surveys/${surveyId}/responses/${responseId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success('Risposta eliminata');
      qc.invalidateQueries({ queryKey: ['admin-survey-responses', surveyId] });
      qc.invalidateQueries({ queryKey: ['admin-survey-stats', surveyId] });
    } catch {
      toast.error("Errore durante l'eliminazione");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <Link href={`/admin/sondaggi/${surveyId}`} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors mb-2">
            <ArrowLeft size={13} /> Panoramica
          </Link>
          <p className="label-luxury text-accent mb-1">Sondaggi</p>
          <h1 className="font-display text-2xl text-primary font-light">Risposte</h1>
          {surveyData?.survey && <p className="text-xs text-gray-400 mt-0.5">{surveyData.survey.title}</p>}
        </div>
        <a
          href={`/api/admin/surveys/${surveyId}/export`}
          className="flex items-center gap-1.5 px-3 py-2 border border-border rounded text-xs text-gray-600 hover:bg-cream transition-colors"
        >
          <Download size={13} /> Esporta CSV
        </a>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-2 items-center">
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca per nome, email, risposta..."
            className="h-8 pl-8 pr-3 border border-border rounded text-xs text-primary bg-white focus:outline-none focus:ring-1 focus:ring-accent w-60"
          />
        </div>
        {starQuestions.length > 0 && (
          <>
            <button
              onClick={() => setRatingFilter(ratingFilter === 'low' ? null : 'low')}
              className={`h-8 px-3 text-xs rounded border transition-colors ${ratingFilter === 'low' ? 'border-red-400 bg-red-50 text-red-700 font-medium' : 'border-border text-gray-600 hover:bg-cream'}`}
            >
              ★ Bassi (1–2)
            </button>
            <button
              onClick={() => setRatingFilter(ratingFilter === 'mid' ? null : 'mid')}
              className={`h-8 px-3 text-xs rounded border transition-colors ${ratingFilter === 'mid' ? 'border-amber-400 bg-amber-50 text-amber-700 font-medium' : 'border-border text-gray-600 hover:bg-cream'}`}
            >
              ★ Medi (3–4)
            </button>
            <button
              onClick={() => setRatingFilter(ratingFilter === 'high' ? null : 'high')}
              className={`h-8 px-3 text-xs rounded border transition-colors ${ratingFilter === 'high' ? 'border-emerald-500 bg-emerald-50 text-emerald-700 font-medium' : 'border-border text-gray-600 hover:bg-cream'}`}
            >
              ★ Alti (5)
            </button>
          </>
        )}
        {textQuestions.length > 0 && (
          <button
            onClick={() => setFilterHasComment(!filterHasComment)}
            className={`h-8 px-3 text-xs rounded border transition-colors flex items-center gap-1.5 ${filterHasComment ? 'border-blue-400 bg-blue-50 text-blue-700 font-medium' : 'border-border text-gray-600 hover:bg-cream'}`}
          >
            <MessageSquare size={11} /> Con commento
          </button>
        )}
        <span className="text-xs text-gray-400 ml-auto">{viewMode === 'comments' ? allComments.length : responses.length} risposte</span>
        {textQuestions.length > 0 && (
          <div className="flex border border-border rounded overflow-hidden">
            <button
              onClick={() => setViewMode('table')}
              className={`h-8 px-3 text-xs flex items-center gap-1.5 transition-colors ${viewMode === 'table' ? 'bg-primary text-white' : 'bg-white text-gray-500 hover:bg-cream'}`}
            >
              <List size={11} /> Risposte
            </button>
            <button
              onClick={() => setViewMode('comments')}
              className={`h-8 px-3 text-xs flex items-center gap-1.5 transition-colors border-l border-border ${viewMode === 'comments' ? 'bg-primary text-white' : 'bg-white text-gray-500 hover:bg-cream'}`}
            >
              <MessageSquare size={11} /> Commenti ({allComments.length})
            </button>
          </div>
        )}
      </div>

      {isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 size={24} className="animate-spin text-gray-400" />
        </div>
      )}

      {/* Comments view */}
      {!isLoading && viewMode === 'comments' && (
        <div className="space-y-3">
          {allComments.length === 0 ? (
            <p className="py-12 text-center text-gray-400 text-xs">Nessun commento</p>
          ) : (
            allComments.map((r) => (
              <div key={r.id} className="bg-white border border-border rounded p-4">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <p className="font-medium text-primary text-xs">{r.respondentName}</p>
                    {r.organizationName && <p className="text-gray-500 text-2xs">{r.organizationName}</p>}
                    <p className="text-gray-400 text-2xs">{new Date(r.submittedAt).toLocaleDateString('it-IT')}</p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    {starQuestions.map((q) => {
                      const v = r.answers[q.key];
                      return typeof v === 'number' ? <StarBadge key={q.key} value={v} /> : null;
                    })}
                  </div>
                </div>
                {textQuestions.map((q) => {
                  const v = r.answers[q.key];
                  if (typeof v !== 'string' || !v.trim()) return null;
                  return (
                    <div key={q.key}>
                      <p className="text-2xs text-gray-400 uppercase tracking-widest mb-1">{q.text}</p>
                      <p className="text-sm text-gray-700 leading-relaxed italic">"{v.trim()}"</p>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      )}

      {!isLoading && viewMode === 'table' && (
        <div className="bg-white border border-border rounded overflow-hidden overflow-x-auto">
          <table className="w-full min-w-[600px] text-xs">
            <thead className="bg-gray-50 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Data</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Respondente</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Canale</th>
                {starQuestions.map((q) => (
                  <th key={q.key} className="text-center px-3 py-3 text-gray-500 font-medium" title={q.text}>
                    <span className="flex items-center justify-center gap-0.5">
                      <Star size={10} className="fill-amber-400 text-amber-400" />
                      {q.text.length > 12 ? q.text.slice(0, 12) + '…' : q.text}
                    </span>
                  </th>
                ))}
                <th className="w-6 px-2" />
                <th className="w-6 px-2" />
              </tr>
            </thead>
            <tbody>
              {responses.length === 0 ? (
                <tr>
                  <td colSpan={4 + starQuestions.length + 2} className="py-12 text-center text-gray-400">
                    Nessuna risposta
                  </td>
                </tr>
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
                        <p className="font-medium text-primary">{r.respondentName}</p>
                        {r.organizationName && <p className="text-gray-500 text-2xs font-medium">{r.organizationName}</p>}
                        <p className="text-gray-400 text-2xs">{r.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <ChannelBadge channel={r.sourceChannel} />
                      </td>
                      {starQuestions.map((q) => {
                        const v = r.answers[q.key];
                        return (
                          <td key={q.key} className="px-3 py-3 text-center">
                            <StarBadge value={typeof v === 'number' ? v : null} />
                          </td>
                        );
                      })}
                      <td className="px-2 py-3 text-gray-400">
                        {expandedId === r.id ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      </td>
                      <td className="px-2 py-3" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleDelete(r.id, r.respondentName)}
                          disabled={deletingId === r.id}
                          className="p-1 text-gray-300 hover:text-red-500 transition-colors disabled:opacity-40"
                          title="Elimina risposta"
                        >
                          {deletingId === r.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                        </button>
                      </td>
                    </tr>

                    {expandedId === r.id && (
                      <tr key={r.id + '-exp'} className="bg-gray-50/80">
                        <td colSpan={4 + starQuestions.length + 2} className="px-6 py-4">
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-2xl">
                            <Detail label="Respondente" value={r.respondentName} />
                            {r.organizationName && <Detail label="Organizzazione" value={r.organizationName} />}
                            <Detail label="Email" value={r.email} />
                            {r.customerCode && <Detail label="Cod. cliente" value={r.customerCode} />}
                            <Detail label="Canale" value={r.sourceChannel ?? '—'} />
                            <Detail label="Data" value={new Date(r.submittedAt).toLocaleString('it-IT')} />
                            {questions.map((q) => {
                              const val = r.answers[q.key];
                              const formatted = formatAnswer(val, q.type);
                              if (q.type === 'text' && formatted !== '—') {
                                return (
                                  <div key={q.key} className="col-span-2 sm:col-span-3">
                                    <p className="text-2xs text-gray-400 uppercase tracking-widest mb-1">{q.text}</p>
                                    <p className="text-sm text-gray-700 leading-relaxed italic">"{formatted}"</p>
                                  </div>
                                );
                              }
                              return <Detail key={q.key} label={q.text} value={formatted} />;
                            })}
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
  if (value === null) return <span className="text-gray-300">—</span>;
  const color = value >= 4 ? 'text-emerald-600' : value >= 3 ? 'text-amber-600' : 'text-red-500';
  return (
    <span className={`font-semibold ${color} flex items-center justify-center gap-0.5`}>
      <Star size={10} className="fill-current" />{value}
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
      <p className="text-2xs text-gray-400 uppercase tracking-widest mb-0.5 truncate" title={label}>{label}</p>
      <p className="text-xs text-gray-700">{value}</p>
    </div>
  );
}
