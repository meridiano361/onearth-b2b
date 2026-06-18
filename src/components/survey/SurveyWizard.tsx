'use client';

import { useEffect, useState, useCallback } from 'react';
import { Star, ChevronRight, ChevronLeft, X, Check } from 'lucide-react';

interface SurveyQuestion {
  id: string;
  questionKey: string;
  questionText: string;
  questionType: 'stars' | 'multi_select' | 'single_select' | 'text';
  optionsJson: string[] | null;
  required: boolean;
  sortOrder: number;
}

interface SurveyData {
  survey: {
    id: string;
    slug: string;
    title: string;
    description: string | null;
    endsAt: string;
    status: string;
    expired: boolean;
    notStarted: boolean;
  };
  questions: SurveyQuestion[];
  customerId: string | null;
  alreadyCompleted: boolean;
}

type Answers = Record<string, number | string | string[]>;

export default function SurveyWizard({ slug, token }: { slug: string; token?: string }) {
  const [data, setData] = useState<SurveyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(0); // 0 = intro, 1..N = questions, N+1 = thank you
  const [answers, setAnswers] = useState<Answers>({});
  const [submitting, setSubmitting] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const trackUrl = `/api/surveys/${slug}/track`;

  useEffect(() => {
    const url = `/api/surveys/${slug}${token ? `?token=${token}` : ''}`;
    fetch(url)
      .then((r) => r.json())
      .then((d: SurveyData) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [slug, token]);

  // Track open
  useEffect(() => {
    if (!data) return;
    fetch(trackUrl, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'open', token }),
    }).catch(() => {});
  }, [data, trackUrl, token]);

  const questions = data?.questions ?? [];
  const totalSteps = questions.length;
  const currentQuestion = step >= 1 && step <= totalSteps ? questions[step - 1] : null;

  function handleAnswer(key: string, value: number | string | string[]) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }

  function handleStart() {
    fetch(trackUrl, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'start', token }),
    }).catch(() => {});
    setStep(1);
  }

  function handleNext() {
    if (step < totalSteps) setStep((s) => s + 1);
    else handleSubmit();
  }

  function handleBack() {
    if (step > 1) setStep((s) => s - 1);
  }

  function handleLater() {
    setDismissed(true);
    window.location.href = '/catalog';
  }

  const canProceed = useCallback(() => {
    if (!currentQuestion) return true;
    if (!currentQuestion.required) return true;
    const val = answers[currentQuestion.questionKey];
    if (val === undefined || val === null) return false;
    if (typeof val === 'string') return val.trim().length > 0;
    if (typeof val === 'number') return val > 0;
    if (Array.isArray(val)) return val.length > 0;
    return false;
  }, [currentQuestion, answers]);

  async function handleSubmit() {
    if (!data) return;
    setSubmitting(true);
    const payload = questions.map((q) => {
      const val = answers[q.questionKey];
      if (q.questionType === 'stars') return { questionKey: q.questionKey, answerNumber: val as number };
      if (q.questionType === 'multi_select') return { questionKey: q.questionKey, answerJson: val };
      return { questionKey: q.questionKey, answerText: val as string };
    });

    const sourceChannel = token ? 'email' : 'in_app';
    try {
      const res = await fetch(`/api/surveys/${slug}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, answers: payload, sourceChannel }),
      });
      if (res.ok) setStep(totalSteps + 1);
    } catch {}
    setSubmitting(false);
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-gray-800 rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex-1 flex items-center justify-center px-6">
        <p className="text-gray-500 text-sm text-center">Questionario non disponibile.</p>
      </div>
    );
  }

  if (data.survey.expired || data.survey.status === 'closed') {
    return <StatusScreen icon="⏱" title="Questionario chiuso" body="Il periodo di raccolta risposte è terminato. Grazie per il tuo tempo." />;
  }

  if (data.alreadyCompleted) {
    return <StatusScreen icon="✅" title="Hai già risposto" body="Grazie per aver condiviso la tua opinione. Il tuo feedback è prezioso per noi." />;
  }

  // Thank you screen
  if (step === totalSteps + 1) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
          <Check size={32} className="text-emerald-600" />
        </div>
        <h1 className="font-display text-2xl font-light tracking-wide text-gray-900 mb-3">Grazie!</h1>
        <p className="text-gray-500 text-sm leading-relaxed max-w-xs mb-8">
          Il tuo feedback è prezioso. Continueremo a migliorare l'app sulla base delle vostre risposte.
        </p>
        <a href="/catalog" className="px-6 py-3 bg-black text-white text-sm rounded-lg hover:bg-gray-800 transition-colors">
          Torna all'app
        </a>
      </div>
    );
  }

  // Intro screen
  if (step === 0) {
    return (
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="px-5 pt-8 pb-0 flex justify-between items-start">
          <div className="flex items-center gap-1.5">
            <span className="text-xs tracking-[0.15em] text-gray-400 uppercase">ON EARTH</span>
          </div>
          <button onClick={handleLater} className="p-2 text-gray-400 hover:text-gray-600 transition-colors" aria-label="Chiudi">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 flex flex-col justify-center px-6 pb-16">
          <div className="max-w-sm mx-auto w-full">
            <div className="flex gap-1 mb-6">
              {[1,2,3,4,5].map((s) => (
                <Star key={s} size={18} className="fill-amber-400 text-amber-400" />
              ))}
            </div>
            <h1 className="font-display text-2xl font-light tracking-wide text-gray-900 mb-3 leading-snug">
              Aiutaci a migliorare l'app
            </h1>
            <p className="text-gray-500 text-sm leading-relaxed mb-2">
              Lascia la tua opinione: bastano solo 2 minuti.
            </p>
            {data.survey.description && (
              <p className="text-gray-400 text-xs mb-8">{data.survey.description}</p>
            )}

            <div className="space-y-3 mt-8">
              <button
                onClick={handleStart}
                className="w-full py-4 bg-black text-white text-sm font-medium rounded-xl hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
              >
                Inizia — {totalSteps} domande
                <ChevronRight size={16} />
              </button>
              <button
                onClick={handleLater}
                className="w-full py-3 text-gray-400 text-sm hover:text-gray-600 transition-colors"
              >
                Più tardi
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Question screen
  if (!currentQuestion) return null;
  const progress = (step / totalSteps) * 100;

  return (
    <div className="flex-1 flex flex-col">
      {/* Progress bar */}
      <div className="h-1 bg-gray-100">
        <div className="h-full bg-black transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>

      {/* Header */}
      <div className="px-5 pt-5 flex justify-between items-center">
        <span className="text-xs text-gray-400">{step} / {totalSteps}</span>
        <button onClick={handleLater} className="p-2 text-gray-400 hover:text-gray-600 transition-colors" aria-label="Chiudi">
          <X size={18} />
        </button>
      </div>

      {/* Question */}
      <div className="flex-1 flex flex-col px-6 pt-6 pb-6">
        <div className="max-w-sm mx-auto w-full flex-1 flex flex-col">
          <h2 className="text-xl font-medium text-gray-900 leading-snug mb-8">
            {currentQuestion.questionText}
          </h2>

          <div className="flex-1">
            {currentQuestion.questionType === 'stars' && (
              <StarInput
                value={answers[currentQuestion.questionKey] as number | undefined}
                onChange={(v) => handleAnswer(currentQuestion.questionKey, v)}
              />
            )}
            {currentQuestion.questionType === 'single_select' && (
              <SingleSelectInput
                options={currentQuestion.optionsJson ?? []}
                value={answers[currentQuestion.questionKey] as string | undefined}
                onChange={(v) => handleAnswer(currentQuestion.questionKey, v)}
              />
            )}
            {currentQuestion.questionType === 'multi_select' && (
              <MultiSelectInput
                options={currentQuestion.optionsJson ?? []}
                value={(answers[currentQuestion.questionKey] as string[]) ?? []}
                onChange={(v) => handleAnswer(currentQuestion.questionKey, v)}
              />
            )}
            {currentQuestion.questionType === 'text' && (
              <TextInput
                value={(answers[currentQuestion.questionKey] as string) ?? ''}
                onChange={(v) => handleAnswer(currentQuestion.questionKey, v)}
              />
            )}
          </div>

          {/* Navigation */}
          <div className="flex gap-3 mt-8">
            {step > 1 && (
              <button
                onClick={handleBack}
                className="flex items-center gap-1.5 px-4 py-3 border border-gray-200 text-gray-600 text-sm rounded-xl hover:bg-gray-50 transition-colors"
              >
                <ChevronLeft size={16} />
                Indietro
              </button>
            )}
            <button
              onClick={handleNext}
              disabled={!canProceed() || submitting}
              className="flex-1 py-4 bg-black text-white text-sm font-medium rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : step === totalSteps ? (
                'Invia risposte'
              ) : (
                <>Avanti <ChevronRight size={16} /></>
              )}
            </button>
          </div>

          <button onClick={handleLater} className="mt-4 text-center text-xs text-gray-400 hover:text-gray-500 transition-colors w-full py-2">
            Più tardi
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StarInput({ value, onChange }: { value?: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  const labels = ['', 'Per niente', 'Poco', 'Abbastanza', 'Molto', 'Moltissimo'];
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex gap-3">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={() => onChange(n)}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            className="p-1 transition-transform hover:scale-110 active:scale-95"
            aria-label={`${n} stelle`}
          >
            <Star
              size={40}
              className={n <= (hover || value || 0) ? 'fill-amber-400 text-amber-400' : 'text-gray-200 fill-gray-100'}
            />
          </button>
        ))}
      </div>
      <p className="text-sm text-gray-500 h-5">
        {labels[hover || value || 0]}
      </p>
    </div>
  );
}

function SingleSelectInput({
  options,
  value,
  onChange,
}: {
  options: string[];
  value?: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-3">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={`w-full py-4 px-5 text-sm rounded-xl border-2 text-left transition-all ${
            value === opt
              ? 'border-black bg-black text-white'
              : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400'
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function MultiSelectInput({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string[];
  onChange: (v: string[]) => void;
}) {
  function toggle(opt: string) {
    const next = value.includes(opt) ? value.filter((o) => o !== opt) : [...value, opt];
    onChange(next);
  }
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const selected = value.includes(opt);
        return (
          <button
            key={opt}
            onClick={() => toggle(opt)}
            className={`py-3 px-5 text-sm rounded-xl border-2 transition-all ${
              selected
                ? 'border-black bg-black text-white'
                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400'
            }`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

function TextInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Scrivi qui la tua risposta..."
      rows={5}
      className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none focus:border-black transition-colors resize-none"
    />
  );
}

function StatusScreen({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
      <div className="text-4xl mb-6">{icon}</div>
      <h1 className="font-display text-2xl font-light tracking-wide text-gray-900 mb-3">{title}</h1>
      <p className="text-gray-500 text-sm leading-relaxed max-w-xs mb-8">{body}</p>
      <a href="/catalog" className="px-6 py-3 bg-black text-white text-sm rounded-lg hover:bg-gray-800 transition-colors">
        Torna all'app
      </a>
    </div>
  );
}
