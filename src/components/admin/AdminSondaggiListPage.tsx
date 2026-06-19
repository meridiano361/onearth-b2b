'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  Plus, BarChart2, MessageSquare, Pencil, Loader2, X,
  CheckCircle, Clock, FileText, Send, Users, ChevronRight,
} from 'lucide-react';

interface Survey {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  status: string;
  startsAt: string;
  endsAt: string;
  createdAt: string;
  _count: { recipients: number; responses: number };
}

function slugify(str: string) {
  return str
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const STATUS_LABEL: Record<string, string> = { draft: 'Bozza', active: 'Attivo', closed: 'Chiuso' };
const STATUS_CLASS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-500',
  active: 'bg-emerald-100 text-emerald-700',
  closed: 'bg-blue-50 text-blue-600',
};

function toLocal(iso: string) {
  return new Date(iso).toISOString().slice(0, 16);
}

function now90d() {
  const d = new Date();
  d.setDate(d.getDate() + 90);
  return d.toISOString().slice(0, 16);
}

export default function AdminSondaggiListPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);

  const { data, isLoading } = useQuery<{ surveys: Survey[] }>({
    queryKey: ['admin-surveys'],
    queryFn: () => fetch('/api/admin/surveys').then((r) => r.json()),
    staleTime: 30_000,
  });

  const surveys = data?.surveys ?? [];

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <p className="label-luxury text-accent mb-1">Admin</p>
          <h1 className="font-display text-2xl text-primary font-light">Sondaggi</h1>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-black text-white rounded text-xs hover:bg-gray-800 transition-colors flex-shrink-0"
        >
          <Plus size={13} />
          Nuovo sondaggio
        </button>
      </div>

      {/* Empty state */}
      {surveys.length === 0 && (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl">
          <MessageSquare size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-400 mb-4">Nessun sondaggio ancora</p>
          <button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-black text-white rounded text-sm hover:bg-gray-800 transition-colors mx-auto"
          >
            <Plus size={14} /> Crea il primo sondaggio
          </button>
        </div>
      )}

      {/* Survey cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {surveys.map((s) => (
          <SurveyCard key={s.id} survey={s} />
        ))}
      </div>

      {/* Create modal */}
      {showNew && <CreateSurveyModal onClose={() => setShowNew(false)} onCreate={(id) => router.push(`/admin/sondaggi/${id}/modifica`)} />}
    </div>
  );
}

// ── Survey card ───────────────────────────────────────────────────────────────

function SurveyCard({ survey }: { survey: Survey }) {
  const responseRate = survey._count.recipients > 0
    ? Math.round((survey._count.responses / survey._count.recipients) * 100)
    : 0;

  return (
    <div className="bg-white border border-border rounded-xl p-5 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h2 className="font-medium text-primary text-sm leading-snug truncate">{survey.title}</h2>
          <p className="text-2xs text-gray-400 mt-0.5 font-mono">{survey.slug}</p>
        </div>
        <span className={`text-2xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${STATUS_CLASS[survey.status] ?? STATUS_CLASS.draft}`}>
          {STATUS_LABEL[survey.status] ?? survey.status}
        </span>
      </div>

      {/* Dates */}
      <p className="text-2xs text-gray-400 mb-4">
        {new Date(survey.startsAt).toLocaleDateString('it-IT')}
        {' → '}
        {new Date(survey.endsAt).toLocaleDateString('it-IT')}
      </p>

      {/* Stats */}
      <div className="flex items-center gap-4 mb-5">
        <Stat icon={<Users size={11} />} value={survey._count.recipients} label="destinatari" />
        <Stat icon={<CheckCircle size={11} />} value={survey._count.responses} label="risposte" />
        <Stat icon={<BarChart2 size={11} />} value={`${responseRate}%`} label="tasso" />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        <Link
          href={`/admin/sondaggi/${survey.id}`}
          className="flex items-center gap-1 px-2.5 py-1.5 border border-border rounded text-2xs text-gray-600 hover:bg-cream transition-colors"
        >
          <BarChart2 size={11} /> Panoramica
        </Link>
        <Link
          href={`/admin/sondaggi/${survey.id}/risposte`}
          className="flex items-center gap-1 px-2.5 py-1.5 border border-border rounded text-2xs text-gray-600 hover:bg-cream transition-colors"
        >
          <MessageSquare size={11} /> Risposte
          {survey._count.responses > 0 && (
            <span className="ml-0.5 bg-gray-100 text-gray-600 rounded-full px-1.5 py-px text-2xs font-medium">
              {survey._count.responses}
            </span>
          )}
        </Link>
        <Link
          href={`/admin/sondaggi/${survey.id}/modifica`}
          className="flex items-center gap-1 px-2.5 py-1.5 border border-border rounded text-2xs text-gray-600 hover:bg-cream transition-colors"
        >
          <Pencil size={11} /> Modifica
        </Link>
        <Link
          href={`/api/admin/surveys/${survey.id}/export`}
          className="flex items-center gap-1 px-2.5 py-1.5 border border-border rounded text-2xs text-gray-600 hover:bg-cream transition-colors"
        >
          <FileText size={11} /> CSV
        </Link>
      </div>
    </div>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: number | string; label: string }) {
  return (
    <div className="flex items-center gap-1 text-gray-500">
      {icon}
      <span className="text-xs font-semibold text-primary">{value}</span>
      <span className="text-2xs">{label}</span>
    </div>
  );
}

// ── Create modal ─────────────────────────────────────────────────────────────

function CreateSurveyModal({ onClose, onCreate }: { onClose: () => void; onCreate: (id: string) => void }) {
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 16);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState('');
  const [startsAt, setStartsAt] = useState(today);
  const [endsAt, setEndsAt] = useState(now90d());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function handleTitleChange(v: string) {
    setTitle(v);
    if (!slugTouched) setSlug(slugify(v));
  }

  async function handleCreate() {
    if (!title.trim() || !slug.trim()) { setError('Titolo e slug sono obbligatori'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/admin/surveys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, slug, description, startsAt, endsAt }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Errore'); return; }
      qc.invalidateQueries({ queryKey: ['admin-surveys'] });
      toast.success('Sondaggio creato');
      onCreate(data.survey.id);
    } catch {
      setError('Errore di rete');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-medium text-primary text-sm">Nuovo sondaggio</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-primary transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <Field label="Titolo *">
            <input
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Es. Sondaggio clienti estate 2026"
              autoFocus
              className="w-full border border-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black/20"
            />
          </Field>

          <Field label="Slug URL *">
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-400 flex-shrink-0">/survey/</span>
              <input
                value={slug}
                onChange={(e) => { setSlug(e.target.value); setSlugTouched(true); }}
                placeholder="sondaggio-estate-2026"
                className="flex-1 border border-border rounded px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-black/20"
              />
            </div>
          </Field>

          <Field label="Descrizione / Incipit">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Breve descrizione mostrata ai destinatari"
              className="w-full border border-border rounded px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-black/20"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Apertura">
              <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)}
                className="w-full border border-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black/20" />
            </Field>
            <Field label="Scadenza">
              <input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)}
                className="w-full border border-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black/20" />
            </Field>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-border">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:text-primary transition-colors">
            Annulla
          </button>
          <button
            onClick={handleCreate}
            disabled={saving || !title.trim() || !slug.trim()}
            className="flex items-center gap-1.5 px-4 py-2 bg-black text-white rounded text-sm hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Crea e configura domande
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1.5">{label}</label>
      {children}
    </div>
  );
}
