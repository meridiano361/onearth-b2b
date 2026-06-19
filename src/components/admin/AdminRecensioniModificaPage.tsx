'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { ArrowLeft, Plus, Trash2, ChevronUp, ChevronDown, Loader2, Save, AlertTriangle, Eye } from 'lucide-react';
import SurveyRichEditor from './SurveyRichEditor';
import SurveyPreviewModal from './SurveyPreviewModal';

const SURVEY_SLUG = 'recensione-app-giugno-2026';

type QuestionType = 'stars' | 'multi_select' | 'single_select' | 'text';

const TYPE_LABELS: Record<QuestionType, string> = {
  stars: 'Stelle (1–5)',
  single_select: 'Scelta singola',
  multi_select: 'Scelta multipla',
  text: 'Testo libero',
};

interface QuestionItem {
  _localId: string;
  id?: string;
  questionKey?: string;
  questionText: string;
  questionType: QuestionType;
  optionsRaw: string;
  required: boolean;
}

interface SurveyFull {
  id: string;
  title: string;
  description: string | null;
  startsAt: string;
  endsAt: string;
  status: string;
  questions: Array<{
    id: string;
    questionKey: string;
    questionText: string;
    questionType: string;
    optionsJson: unknown;
    required: boolean;
    sortOrder: number;
  }>;
}

let _lid = 0;
const lid = () => `l${++_lid}`;

function toLocal(iso: string) {
  return new Date(iso).toISOString().slice(0, 16);
}

export default function AdminRecensioniModificaPage() {
  const [surveyId, setSurveyId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [status, setStatus] = useState('draft');
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasResponses, setHasResponses] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    (async () => {
      const list = await fetch('/api/admin/surveys').then((r) => r.json());
      const s = list.surveys?.find((x: any) => x.slug === SURVEY_SLUG) ?? list.surveys?.[0];
      if (!s) { setLoading(false); return; }
      setHasResponses((s._count?.responses ?? 0) > 0);

      const { survey }: { survey: SurveyFull } = await fetch(`/api/admin/surveys/${s.id}`).then((r) => r.json());
      setSurveyId(survey.id);
      setTitle(survey.title);
      setDescription(survey.description ?? '');
      setStartsAt(toLocal(survey.startsAt));
      setEndsAt(toLocal(survey.endsAt));
      setStatus(survey.status);
      setQuestions(
        survey.questions.map((q) => ({
          _localId: lid(),
          id: q.id,
          questionKey: q.questionKey,
          questionText: q.questionText,
          questionType: q.questionType as QuestionType,
          optionsRaw: Array.isArray(q.optionsJson) ? (q.optionsJson as string[]).join('\n') : '',
          required: q.required,
        }))
      );
      setLoading(false);
    })();
  }, []);

  const move = (idx: number, dir: -1 | 1) => {
    const next = idx + dir;
    setQuestions((prev) => {
      if (next < 0 || next >= prev.length) return prev;
      const arr = [...prev];
      [arr[idx], arr[next]] = [arr[next], arr[idx]];
      return arr;
    });
  };

  const remove = (idx: number) => {
    const q = questions[idx];
    if (hasResponses && q.id && !confirm(`Eliminare questa domanda cancellerà le risposte associate (chiave: "${q.questionKey}"). Continuare?`)) return;
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

  const update = (idx: number, patch: Partial<QuestionItem>) =>
    setQuestions((prev) => prev.map((q, i) => (i === idx ? { ...q, ...patch } : q)));

  const addQuestion = () =>
    setQuestions((prev) => [...prev, { _localId: lid(), questionText: '', questionType: 'text', optionsRaw: '', required: true }]);

  const handleSave = async () => {
    if (!surveyId) return;
    setSaving(true);
    try {
      const [metaRes, qRes] = await Promise.all([
        fetch(`/api/admin/surveys/${surveyId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, description, startsAt, endsAt, status }),
        }),
        fetch(`/api/admin/surveys/${surveyId}/questions`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            questions: questions.map((q, i) => ({
              id: q.id,
              questionText: q.questionText,
              questionType: q.questionType,
              optionsJson: q.questionType === 'multi_select' || q.questionType === 'single_select'
                ? q.optionsRaw.split('\n').map((s) => s.trim()).filter(Boolean)
                : null,
              required: q.required,
              sortOrder: i + 1,
            })),
          }),
        }),
      ]);

      if (!metaRes.ok || !qRes.ok) throw new Error();

      const { questions: saved } = await qRes.json();
      setQuestions((prev) =>
        prev.map((q, i) => ({
          ...q,
          id: saved[i]?.id ?? q.id,
          questionKey: saved[i]?.questionKey ?? q.questionKey,
        }))
      );
      toast.success('Questionario salvato');
    } catch {
      toast.error('Errore durante il salvataggio');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-gray-400" />
      </div>
    );
  }

  if (!surveyId) {
    return (
      <div className="p-8">
        <p className="text-sm text-gray-400">Nessuna survey trovata.</p>
        <Link href="/admin/recensioni" className="text-xs text-accent underline mt-2 inline-block">← Torna</Link>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Link href="/admin/recensioni" className="text-gray-400 hover:text-primary transition-colors p-1 -ml-1">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <p className="label-luxury text-accent mb-0.5">Admin · Recensioni</p>
            <h1 className="font-display text-2xl text-primary font-light">Modifica questionario</h1>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setShowPreview(true)}
            className="flex items-center gap-1.5 px-3 py-2 border border-border rounded text-xs text-gray-600 hover:bg-cream transition-colors"
          >
            <Eye size={13} />
            <span className="hidden sm:inline">Anteprima</span>
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 bg-black text-white rounded text-sm hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Salva
          </button>
        </div>
      </div>

      {hasResponses && (
        <div className="mb-6 flex items-start gap-2.5 p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 leading-relaxed">
          <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
          Esistono già risposte a questo questionario. Eliminare domande cancellerà le risposte associate. Modificare il testo non altera i dati esistenti.
        </div>
      )}

      {/* Survey metadata */}
      <section className="bg-white border border-border rounded-xl p-5 mb-5 space-y-4">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Informazioni generali</h2>

        <Field label="Titolo">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border border-border rounded px-3 py-2 text-sm text-primary focus:outline-none focus:ring-1 focus:ring-black/20"
          />
        </Field>

        <Field label="Testo di incipit / Descrizione">
          <SurveyRichEditor
            content={description}
            onChange={setDescription}
            variant="full"
          />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Apertura">
            <input
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              className="w-full border border-border rounded px-3 py-2 text-sm text-primary focus:outline-none focus:ring-1 focus:ring-black/20"
            />
          </Field>
          <Field label="Scadenza">
            <input
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              className="w-full border border-border rounded px-3 py-2 text-sm text-primary focus:outline-none focus:ring-1 focus:ring-black/20"
            />
          </Field>
        </div>

        <Field label="Stato">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="border border-border rounded px-3 py-2 text-sm text-primary focus:outline-none focus:ring-1 focus:ring-black/20 w-auto"
          >
            <option value="draft">Bozza (non visibile)</option>
            <option value="active">Attiva</option>
            <option value="closed">Chiusa</option>
          </select>
        </Field>
      </section>

      {/* Questions */}
      <section>
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Domande <span className="font-normal normal-case text-gray-400 ml-1">({questions.length})</span>
        </h2>

        <div className="space-y-3 mb-4">
          {questions.map((q, idx) => (
            <QuestionCard
              key={q._localId}
              q={q}
              idx={idx}
              total={questions.length}
              onUp={() => move(idx, -1)}
              onDown={() => move(idx, 1)}
              onDelete={() => remove(idx)}
              onChange={(patch) => update(idx, patch)}
            />
          ))}
        </div>

        <button
          onClick={addQuestion}
          className="flex items-center gap-2 w-full justify-center px-4 py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:border-gray-300 hover:text-gray-500 transition-colors"
        >
          <Plus size={15} />
          Aggiungi domanda
        </button>
      </section>

      {/* Sticky save bar (mobile) */}
      <div className="fixed bottom-0 left-0 right-0 sm:hidden bg-white border-t border-border px-4 py-3 flex justify-end gap-2">
        <button
          onClick={() => setShowPreview(true)}
          className="flex items-center gap-1.5 px-3 py-2 border border-border rounded text-xs text-gray-600"
        >
          <Eye size={13} /> Anteprima
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 px-5 py-2 bg-black text-white rounded text-sm disabled:opacity-50"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Salva
        </button>
      </div>
      <div className="h-16 sm:hidden" />

      {/* Preview modal */}
      {showPreview && (
        <SurveyPreviewModal
          title={title}
          description={description}
          questions={questions}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

// ── QuestionCard ─────────────────────────────────────────────────────────────

function QuestionCard({
  q, idx, total, onUp, onDown, onDelete, onChange,
}: {
  q: QuestionItem;
  idx: number;
  total: number;
  onUp: () => void;
  onDown: () => void;
  onDelete: () => void;
  onChange: (patch: Partial<QuestionItem>) => void;
}) {
  const hasOptions = q.questionType === 'multi_select' || q.questionType === 'single_select';

  return (
    <div className="bg-white border border-border rounded-xl p-4 space-y-3">
      {/* Top row */}
      <div className="flex items-center gap-2">
        <span className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-500 flex-shrink-0">
          {idx + 1}
        </span>
        <div className="flex gap-0.5">
          <button onClick={onUp} disabled={idx === 0} className="p-1 rounded hover:bg-gray-100 disabled:opacity-25 transition-colors" title="Sposta su">
            <ChevronUp size={14} />
          </button>
          <button onClick={onDown} disabled={idx === total - 1} className="p-1 rounded hover:bg-gray-100 disabled:opacity-25 transition-colors" title="Sposta giù">
            <ChevronDown size={14} />
          </button>
        </div>
        {q.questionKey && (
          <span className="text-gray-300 text-2xs font-mono hidden sm:inline truncate max-w-[140px]" title={q.questionKey}>
            {q.questionKey}
          </span>
        )}
        <div className="flex-1" />
        <button onClick={onDelete} className="p-1.5 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors" title="Elimina domanda">
          <Trash2 size={14} />
        </button>
      </div>

      {/* Question text — rich editor */}
      <Field label="Testo della domanda">
        <SurveyRichEditor
          content={q.questionText}
          onChange={(html) => onChange({ questionText: html })}
          variant="inline"
        />
      </Field>

      {/* Type + required */}
      <div className="flex flex-wrap items-end gap-4">
        <Field label="Tipo di risposta">
          <select
            value={q.questionType}
            onChange={(e) => onChange({ questionType: e.target.value as QuestionType })}
            className="border border-border rounded px-3 py-2 text-sm text-primary focus:outline-none focus:ring-1 focus:ring-black/20 w-auto"
          >
            {(Object.entries(TYPE_LABELS) as [QuestionType, string][]).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </Field>

        <label className="flex items-center gap-2 pb-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={q.required}
            onChange={(e) => onChange({ required: e.target.checked })}
            className="rounded border-border accent-black"
          />
          <span className="text-xs text-gray-600">Obbligatoria</span>
        </label>
      </div>

      {/* Options */}
      {hasOptions && (
        <Field label={`Opzioni di risposta — una per riga${q.questionType === 'multi_select' ? ' (selezione multipla)' : ' (selezione singola)'}`}>
          <textarea
            value={q.optionsRaw}
            onChange={(e) => onChange({ optionsRaw: e.target.value })}
            rows={Math.max(3, q.optionsRaw.split('\n').length + 1)}
            placeholder={"Prima opzione\nSeconda opzione\nTerza opzione"}
            className="w-full border border-border rounded px-3 py-2 text-sm text-primary focus:outline-none focus:ring-1 focus:ring-black/20 resize-none font-mono text-xs leading-relaxed"
          />
        </Field>
      )}
    </div>
  );
}
