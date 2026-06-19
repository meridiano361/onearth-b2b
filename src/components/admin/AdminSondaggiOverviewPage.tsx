'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Send, Download, Star, Users, Mail, Bell,
  Eye, CheckCircle, Loader2, Pencil, MessageSquare, Contact, Clock, X,
} from 'lucide-react';

interface QuestionStat {
  key: string;
  text: string;
  type: string;
  avg?: number | null;
  dist: Record<string, number>;
  total: number;
}

interface Stats {
  totalRecipients: number;
  totalPushSent: number;
  totalEmailSent: number;
  totalOpened: number;
  totalCompleted: number;
  responseRate: number;
  questions: QuestionStat[];
}

interface SurveyMeta {
  id: string;
  slug: string;
  title: string;
  status: string;
  endsAt: string;
}

interface ScheduledNotif {
  id: string;
  title: string;
  body: string;
  scheduledAt: string;
  channel: string;
  target: string;
  status: string;
  sentAt: string | null;
  sentCount: number;
}

export default function AdminSondaggiOverviewPage({ surveyId }: { surveyId: string }) {
  const queryClient = useQueryClient();
  const [notifTitle, setNotifTitle] = useState('');
  const [notifBody, setNotifBody] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [channel, setChannel] = useState('both');
  const [target, setTarget] = useState('pending');

  const { data: surveyData } = useQuery<{ survey: SurveyMeta }>({
    queryKey: ['admin-survey-meta', surveyId],
    queryFn: () => fetch(`/api/admin/surveys/${surveyId}`).then((r) => r.json()),
    staleTime: 60_000,
  });

  const { data: stats, isLoading: statsLoading } = useQuery<Stats>({
    queryKey: ['admin-survey-stats', surveyId],
    queryFn: () => fetch(`/api/admin/surveys/${surveyId}/stats`).then((r) => r.json()),
    staleTime: 30_000,
  });

  const sendMutation = useMutation({
    mutationFn: () => fetch(`/api/admin/surveys/${surveyId}/send`, { method: 'POST' }).then((r) => r.json()),
    onSuccess: (result) => {
      const msg = `${result.emailSent ?? 0} email, ${result.pushSent ?? 0} push inviati`;
      const failed = result.emailFailed ?? 0;
      if (failed > 0) toast.error(`${msg} — ${failed} email fallite`);
      else toast.success(`Invio completato: ${msg}`);
    },
    onError: () => toast.error("Errore durante l'invio"),
  });

  const { data: notifsData } = useQuery<{ notifications: ScheduledNotif[] }>({
    queryKey: ['survey-scheduled-notifs', surveyId],
    queryFn: () => fetch(`/api/admin/surveys/${surveyId}/notifications`).then((r) => r.json()),
    staleTime: 30_000,
  });

  const createNotifMutation = useMutation({
    mutationFn: (payload: { title: string; body: string; scheduledAt: string; channel: string; target: string }) =>
      fetch(`/api/admin/surveys/${surveyId}/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).then((r) => r.json()),
    onSuccess: (data) => {
      if (data.error) { toast.error(data.error); return; }
      toast.success(data.notification?.status === 'sent' ? 'Notifica inviata' : 'Notifica pianificata');
      queryClient.invalidateQueries({ queryKey: ['survey-scheduled-notifs', surveyId] });
      setNotifTitle('');
      setNotifBody('');
      setScheduledAt('');
    },
    onError: () => toast.error('Errore durante la creazione della notifica'),
  });

  const cancelNotifMutation = useMutation({
    mutationFn: (notifId: string) =>
      fetch(`/api/admin/surveys/${surveyId}/notifications/${notifId}`, { method: 'DELETE' }).then((r) => r.json()),
    onSuccess: (data) => {
      if (data.error) { toast.error(data.error); return; }
      toast.success('Notifica annullata');
      queryClient.invalidateQueries({ queryKey: ['survey-scheduled-notifs', surveyId] });
    },
    onError: () => toast.error("Errore durante l'annullamento"),
  });

  function sendNow() {
    if (!notifTitle.trim() || !notifBody.trim()) { toast.error('Titolo e testo obbligatori'); return; }
    createNotifMutation.mutate({ title: notifTitle, body: notifBody, scheduledAt: new Date().toISOString(), channel, target });
  }

  function scheduleNotif() {
    if (!notifTitle.trim() || !notifBody.trim()) { toast.error('Titolo e testo obbligatori'); return; }
    if (!scheduledAt) { toast.error('Seleziona data e ora'); return; }
    createNotifMutation.mutate({ title: notifTitle, body: notifBody, scheduledAt: new Date(scheduledAt).toISOString(), channel, target });
  }

  const survey = surveyData?.survey;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Link href="/admin/sondaggi" className="text-gray-400 hover:text-primary transition-colors p-1 -ml-1">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <p className="label-luxury text-accent mb-1">Sondaggi</p>
            <h1 className="font-display text-2xl text-primary font-light">
              {survey?.title ?? '…'}
            </h1>
            {survey && (
              <p className="text-xs text-gray-400 mt-0.5">
                Scadenza: {new Date(survey.endsAt).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {survey && (
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${survey.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
              {survey.status === 'active' ? 'Attivo' : survey.status === 'closed' ? 'Chiuso' : 'Bozza'}
            </span>
          )}
          <Link href={`/admin/sondaggi/${surveyId}/destinatari`} className="flex items-center gap-1.5 px-3 py-2 border border-border rounded text-xs text-gray-600 hover:bg-cream transition-colors">
            <Contact size={13} /> Destinatari
          </Link>
          <Link href={`/admin/sondaggi/${surveyId}/risposte`} className="flex items-center gap-1.5 px-3 py-2 border border-border rounded text-xs text-gray-600 hover:bg-cream transition-colors">
            <MessageSquare size={13} /> Risposte
          </Link>
          <Link href={`/admin/sondaggi/${surveyId}/modifica`} className="flex items-center gap-1.5 px-3 py-2 border border-border rounded text-xs text-gray-600 hover:bg-cream transition-colors">
            <Pencil size={13} /> Modifica
          </Link>
          <a href={`/api/admin/surveys/${surveyId}/export`} className="flex items-center gap-1.5 px-3 py-2 border border-border rounded text-xs text-gray-600 hover:bg-cream transition-colors">
            <Download size={13} /> CSV
          </a>
          <button
            onClick={() => sendMutation.mutate()}
            disabled={sendMutation.isPending}
            className="flex items-center gap-1.5 px-3 py-2 bg-black text-white rounded text-xs hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {sendMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
            Invia sondaggio
          </button>
        </div>
      </div>

      {statsLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin text-gray-400" />
        </div>
      )}

      {stats && (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
            <KpiCard icon={<Users size={15} />} label="Destinatari" value={stats.totalRecipients} />
            <KpiCard icon={<Bell size={15} />} label="Push inviate" value={stats.totalPushSent} />
            <KpiCard icon={<Mail size={15} />} label="Email inviate" value={stats.totalEmailSent} />
            <KpiCard icon={<Eye size={15} />} label="Aperture" value={stats.totalOpened} />
            <KpiCard icon={<CheckCircle size={15} />} label="Completati" value={stats.totalCompleted} color="text-emerald-600" />
            <KpiCard icon={<Star size={15} />} label="Tasso risposta" value={`${stats.responseRate}%`}
              color={stats.responseRate >= 30 ? 'text-emerald-600' : 'text-amber-600'} />
          </div>

          {/* Question charts */}
          {stats.questions.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {stats.questions.map((q) => {
                if (q.type === 'stars') {
                  return <StarChart key={q.key} title={q.text} avg={q.avg ?? null} dist={q.dist} total={stats.totalCompleted} />;
                }
                if (q.type === 'single_select' || q.type === 'multi_select') {
                  return <DistChart key={q.key} title={q.text} dist={q.dist} total={stats.totalCompleted} />;
                }
                if (q.type === 'text') {
                  return (
                    <div key={q.key} className="bg-white border border-border rounded-lg p-5">
                      <p className="text-sm font-medium text-primary mb-2 truncate" title={q.text}>{q.text}</p>
                      <p className="text-xs text-gray-400">
                        {q.total} risposte aperte su {stats.totalCompleted} totali
                      </p>
                    </div>
                  );
                }
                return null;
              })}
            </div>
          )}

          {stats.totalCompleted === 0 && (
            <div className="text-center py-12 text-gray-400 text-sm">
              Nessuna risposta ancora ricevuta.
            </div>
          )}
        </>
      )}

      {/* Scheduled notifications */}
      <div className="mt-10">
        <p className="label-luxury text-accent mb-4">Notifiche programmate</p>

        <div className="bg-white border border-border rounded-lg p-5 mb-4">
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Titolo (es. OnEarth)"
              value={notifTitle}
              onChange={(e) => setNotifTitle(e.target.value)}
              className="w-full border border-border rounded px-3 py-2 text-sm text-primary focus:outline-none focus:ring-1 focus:ring-black"
            />
            <textarea
              rows={3}
              placeholder="Testo del messaggio..."
              value={notifBody}
              onChange={(e) => setNotifBody(e.target.value)}
              className="w-full border border-border rounded px-3 py-2 text-sm text-primary focus:outline-none focus:ring-1 focus:ring-black resize-none"
            />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Data e ora (ora italiana)</label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="w-full border border-border rounded px-3 py-2 text-sm text-primary focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Canale</label>
                <select
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                  className="w-full border border-border rounded px-3 py-2 text-sm text-primary focus:outline-none focus:ring-1 focus:ring-black bg-white"
                >
                  <option value="both">Push + Email</option>
                  <option value="push">Solo Push</option>
                  <option value="email">Solo Email</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Destinatari</label>
                <select
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  className="w-full border border-border rounded px-3 py-2 text-sm text-primary focus:outline-none focus:ring-1 focus:ring-black bg-white"
                >
                  <option value="pending">Non rispondenti</option>
                  <option value="all">Tutti i destinatari</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={sendNow}
                disabled={createNotifMutation.isPending}
                className="flex items-center gap-1.5 px-3 py-2 border border-border rounded text-xs text-gray-600 hover:bg-cream transition-colors disabled:opacity-50"
              >
                {createNotifMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                Invia ora
              </button>
              <button
                type="button"
                onClick={scheduleNotif}
                disabled={createNotifMutation.isPending}
                className="flex items-center gap-1.5 px-3 py-2 bg-black text-white rounded text-xs hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                {createNotifMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Clock size={13} />}
                Pianifica
              </button>
            </div>
          </div>
        </div>

        {(notifsData?.notifications?.length ?? 0) > 0 && (
          <div className="space-y-2">
            {notifsData!.notifications.map((n) => (
              <div key={n.id} className="bg-white border border-border rounded-lg p-4 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-sm font-medium text-primary truncate">{n.title}</span>
                    <NotifStatusBadge status={n.status} />
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-2 mb-2">{n.body}</p>
                  <div className="flex flex-wrap gap-3 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <Clock size={11} />
                      {new Date(n.scheduledAt).toLocaleString('it-IT', {
                        timeZone: 'Europe/Rome',
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                      })}
                    </span>
                    <span>{n.channel === 'both' ? 'Push + Email' : n.channel === 'push' ? 'Solo Push' : 'Solo Email'}</span>
                    <span>{n.target === 'pending' ? 'Non rispondenti' : 'Tutti'}</span>
                    {n.sentCount > 0 && <span>{n.sentCount} inviati</span>}
                  </div>
                </div>
                {n.status === 'pending' && (
                  <button
                    type="button"
                    onClick={() => cancelNotifMutation.mutate(n.id)}
                    disabled={cancelNotifMutation.isPending}
                    className="text-gray-300 hover:text-red-400 transition-colors p-1 flex-shrink-0 mt-0.5"
                    title="Annulla"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
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

function StarChart({ title, avg, dist, total }: { title: string; avg: number | null; dist: Record<string, number>; total: number }) {
  return (
    <div className="bg-white border border-border rounded-lg p-5">
      <div className="flex items-start justify-between mb-4">
        <p className="text-sm font-medium text-primary leading-snug flex-1 mr-2 line-clamp-2" title={title}>{title}</p>
        {avg !== null && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <Star size={14} className="fill-amber-400 text-amber-400" />
            <span className="text-lg font-bold text-primary">{avg.toFixed(1)}</span>
          </div>
        )}
      </div>
      <div className="space-y-2">
        {[5, 4, 3, 2, 1].map((n) => {
          const count = (dist[n] ?? dist[String(n)]) ?? 0;
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

function DistChart({ title, dist, total }: { title: string; dist: Record<string, number>; total: number }) {
  const entries = Object.entries(dist).sort((a, b) => b[1] - a[1]);
  return (
    <div className="bg-white border border-border rounded-lg p-5">
      <p className="text-sm font-medium text-primary mb-4 line-clamp-2" title={title}>{title}</p>
      <div className="space-y-2.5">
        {entries.map(([label, count]) => {
          const pct = total > 0 ? (count / total) * 100 : 0;
          return (
            <div key={label} className="flex items-center gap-2">
              <span className="text-xs text-gray-600 flex-shrink-0 w-24 truncate" title={label}>{label}</span>
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

function NotifStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    pending:   { label: 'In attesa',  className: 'bg-amber-100 text-amber-700' },
    sending:   { label: 'Invio…',     className: 'bg-blue-100 text-blue-700' },
    sent:      { label: 'Inviata',    className: 'bg-emerald-100 text-emerald-700' },
    cancelled: { label: 'Annullata',  className: 'bg-gray-100 text-gray-500' },
  };
  const m = map[status] ?? { label: status, className: 'bg-gray-100 text-gray-500' };
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${m.className}`}>{m.label}</span>;
}
