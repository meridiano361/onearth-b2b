'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { Send, Download, Star, Users, Mail, Bell, Eye, CheckCircle, ChevronRight, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const SURVEY_ID_KEY = 'recensione-app-giugno-2026';

interface Survey {
  id: string;
  slug: string;
  title: string;
  status: string;
  endsAt: string;
  _count: { recipients: number; responses: number };
}

interface Stats {
  totalRecipients: number;
  totalPushSent: number;
  totalEmailSent: number;
  totalOpened: number;
  totalCompleted: number;
  responseRate: number;
  avgSoddisfazione: number | null;
  avgFacilitaUso: number | null;
  distSoddisfazione: Record<string, number>;
  distFacilitaUso: Record<string, number>;
  distSezioniUtili: Record<string, number>;
  distPrenotazioniFuture: Record<string, number>;
  distUsoDemetra: Record<string, number>;
}

export default function AdminRecensioniPage() {
  const { data: surveysData, isLoading: surveysLoading } = useQuery<{ surveys: Survey[] }>({
    queryKey: ['admin-surveys'],
    queryFn: () => fetch('/api/admin/surveys').then((r) => r.json()),
    staleTime: 30_000,
  });

  const survey = surveysData?.surveys?.find((s) => s.slug === SURVEY_ID_KEY) ?? surveysData?.surveys?.[0];

  const { data: stats, isLoading: statsLoading } = useQuery<Stats>({
    queryKey: ['admin-survey-stats', survey?.id],
    queryFn: () => fetch(`/api/admin/surveys/${survey!.id}/stats`).then((r) => r.json()),
    enabled: !!survey?.id,
    staleTime: 30_000,
  });

  const sendMutation = useMutation({
    mutationFn: () =>
      fetch(`/api/admin/surveys/${survey!.id}/send`, { method: 'POST' }).then((r) => r.json()),
    onSuccess: (result) => {
      toast.success(`Invio completato: ${result.emailSent} email, ${result.pushSent} push`);
    },
    onError: () => toast.error('Errore durante l\'invio'),
  });

  if (surveysLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-gray-400" />
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="p-8">
        <h1 className="font-display text-2xl text-primary font-light mb-4">Recensioni</h1>
        <p className="text-sm text-gray-400 mb-6">Nessuna survey trovata. Esegui lo script di lancio per creare la survey.</p>
        <code className="block bg-gray-50 border border-border rounded px-4 py-3 text-xs text-gray-600 font-mono">
          npx tsx scripts/launch-survey-giugno-2026.ts
        </code>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <p className="label-luxury text-accent mb-1">Admin · Recensioni</p>
          <h1 className="font-display text-2xl text-primary font-light">Panoramica Survey</h1>
          <p className="text-sm text-gray-400 mt-0.5 max-w-xl leading-snug">{survey.title}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/recensioni/risposte"
            className="flex items-center gap-1.5 px-3 py-2 border border-border rounded text-xs text-gray-600 hover:bg-cream transition-colors"
          >
            Vedi risposte <ChevronRight size={12} />
          </Link>
          <a
            href={`/api/admin/surveys/${survey.id}/export`}
            className="flex items-center gap-1.5 px-3 py-2 border border-border rounded text-xs text-gray-600 hover:bg-cream transition-colors"
          >
            <Download size={13} />
            <span className="hidden sm:inline">Esporta CSV</span>
          </a>
          <button
            onClick={() => sendMutation.mutate()}
            disabled={sendMutation.isPending}
            className="flex items-center gap-1.5 px-3 py-2 bg-black text-white rounded text-xs hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {sendMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
            <span className="hidden sm:inline">Invia ora</span>
          </button>
        </div>
      </div>

      {/* Status badge */}
      <div className="mb-6 flex items-center gap-3 flex-wrap">
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${survey.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
          {survey.status === 'active' ? 'Attiva' : survey.status}
        </span>
        <span className="text-xs text-gray-400">Scadenza: {new Date(survey.endsAt).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
      </div>

      {statsLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin text-gray-400" />
        </div>
      )}

      {stats && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
            <KpiCard icon={<Users size={15} />} label="Destinatari" value={stats.totalRecipients} />
            <KpiCard icon={<Bell size={15} />} label="Push inviate" value={stats.totalPushSent} />
            <KpiCard icon={<Mail size={15} />} label="Email inviate" value={stats.totalEmailSent} />
            <KpiCard icon={<Eye size={15} />} label="Survey aperte" value={stats.totalOpened} />
            <KpiCard icon={<CheckCircle size={15} />} label="Completate" value={stats.totalCompleted} color="text-emerald-600" />
            <KpiCard icon={<Star size={15} />} label="Tasso risposta" value={`${stats.responseRate}%`} color={stats.responseRate >= 30 ? 'text-emerald-600' : 'text-amber-600'} />
          </div>

          {/* Star averages */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <StarChart
              title="Soddisfazione complessiva"
              avg={stats.avgSoddisfazione}
              dist={stats.distSoddisfazione}
              total={stats.totalCompleted}
            />
            <StarChart
              title="Facilità d'uso"
              avg={stats.avgFacilitaUso}
              dist={stats.distFacilitaUso}
              total={stats.totalCompleted}
            />
          </div>

          {/* Distribution charts */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <DistChart title="Prenotazioni future" dist={stats.distPrenotazioniFuture} total={stats.totalCompleted} />
            <DistChart title="Uso Demetra" dist={stats.distUsoDemetra} total={stats.totalCompleted} />
            <DistChart title="Sezioni più utili" dist={stats.distSezioniUtili} total={stats.totalCompleted} horizontal />
          </div>
        </>
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function KpiCard({ icon, label, value, color = 'text-primary' }: {
  icon: React.ReactNode; label: string; value: number | string; color?: string;
}) {
  return (
    <div className="bg-white border border-border rounded-lg p-4">
      <div className="flex items-center gap-1.5 text-gray-400 mb-2">{icon}<span className="text-xs">{label}</span></div>
      <p className={`text-2xl font-semibold ${color}`}>{value}</p>
    </div>
  );
}

function StarChart({ title, avg, dist, total }: {
  title: string; avg: number | null; dist: Record<string, number>; total: number;
}) {
  return (
    <div className="bg-white border border-border rounded-lg p-5">
      <div className="flex items-start justify-between mb-4">
        <p className="text-sm font-medium text-primary">{title}</p>
        {avg !== null && (
          <div className="flex items-center gap-1">
            <Star size={14} className="fill-amber-400 text-amber-400" />
            <span className="text-lg font-bold text-primary">{avg.toFixed(1)}</span>
          </div>
        )}
      </div>
      <div className="space-y-2">
        {[5, 4, 3, 2, 1].map((n) => {
          const count = dist[n] ?? 0;
          const pct = total > 0 ? (count / total) * 100 : 0;
          return (
            <div key={n} className="flex items-center gap-2">
              <span className="text-xs text-gray-500 w-4 flex-shrink-0">{n}</span>
              <Star size={11} className="fill-amber-300 text-amber-300 flex-shrink-0" />
              <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }} />
              </div>
              <span className="text-xs text-gray-400 w-6 text-right flex-shrink-0">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DistChart({ title, dist, total, horizontal }: {
  title: string; dist: Record<string, number>; total: number; horizontal?: boolean;
}) {
  const entries = Object.entries(dist).sort((a, b) => b[1] - a[1]);
  return (
    <div className="bg-white border border-border rounded-lg p-5">
      <p className="text-sm font-medium text-primary mb-4">{title}</p>
      <div className="space-y-2.5">
        {entries.map(([label, count]) => {
          const pct = total > 0 ? (count / total) * 100 : 0;
          return (
            <div key={label} className="flex items-center gap-2">
              <span className="text-xs text-gray-600 flex-shrink-0" style={{ minWidth: horizontal ? '80px' : '30px', maxWidth: horizontal ? '100px' : '40px', fontSize: '11px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
              <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                <div className="h-full bg-black rounded-full" style={{ width: `${pct}%` }} />
              </div>
              <span className="text-xs text-gray-400 w-8 text-right flex-shrink-0">{Math.round(pct)}%</span>
            </div>
          );
        })}
        {entries.length === 0 && <p className="text-xs text-gray-400">Nessuna risposta ancora</p>}
      </div>
    </div>
  );
}
