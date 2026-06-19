'use client';

import { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Star } from 'lucide-react';

type QuestionType = 'stars' | 'multi_select' | 'single_select' | 'text';

interface PreviewQuestion {
  questionText: string;
  questionType: QuestionType;
  optionsRaw: string;
  required: boolean;
}

interface Props {
  title: string;
  description: string;
  questions: PreviewQuestion[];
  onClose: () => void;
}

const PREVIEW_STYLES = `
  .prte p { margin: 0; }
  .prte p + p { margin-top: 3px; }
  .prte strong { font-weight: 700; }
  .prte em { font-style: italic; }
  .prte u { text-decoration: underline; }
  .prte h2 { font-size: 1.1em; font-weight: 600; margin: 2px 0; }
  .prte h3 { font-size: 1em; font-weight: 600; margin: 2px 0; }
  .prte ul { list-style: disc; padding-left: 1.4em; margin: 3px 0; }
  .prte ol { list-style: decimal; padding-left: 1.4em; margin: 3px 0; }
`;

export default function SurveyPreviewModal({ title, description, questions, onClose }: Props) {
  const [step, setStep] = useState(0); // 0 = intro, 1..N = questions, N+1 = thankyou
  const total = questions.length;
  const currentQuestion = step >= 1 && step <= total ? questions[step - 1] : null;
  const progress = step >= 1 && step <= total ? (step / total) * 100 : 0;

  // Close on Esc
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const stepLabel =
    step === 0 ? 'Schermata iniziale' :
    step <= total ? `Domanda ${step} di ${total}` :
    'Schermata finale';

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-xs shadow-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: 'calc(100vh - 2rem)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <style>{PREVIEW_STYLES}</style>

        {/* Modal header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
          <span className="text-xs font-medium text-primary">Anteprima questionario</span>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-primary transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Step navigator */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-gray-50 flex-shrink-0">
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="p-1 text-gray-400 hover:text-primary disabled:opacity-30 transition-colors"
          >
            <ChevronLeft size={15} />
          </button>
          <span className="text-2xs text-gray-500">{stepLabel}</span>
          <button
            onClick={() => setStep((s) => Math.min(total + 1, s + 1))}
            disabled={step === total + 1}
            className="p-1 text-gray-400 hover:text-primary disabled:opacity-30 transition-colors"
          >
            <ChevronRight size={15} />
          </button>
        </div>

        {/* Phone content */}
        <div className="bg-[#faf8f5] flex-1 flex flex-col overflow-y-auto">
          {/* Progress bar */}
          <div className="h-0.5 bg-gray-100 flex-shrink-0">
            <div className="h-full bg-black transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>

          {/* ── Intro ── */}
          {step === 0 && (
            <div className="flex-1 flex flex-col justify-center px-6 py-8">
              <div className="flex gap-1 mb-5">
                {[1,2,3,4,5].map((s) => (
                  <Star key={s} size={15} className="fill-amber-400 text-amber-400" />
                ))}
              </div>
              <h1 className="font-display text-xl font-light text-gray-900 leading-snug mb-3">
                Aiutaci a migliorare l'app
              </h1>
              <p className="text-gray-500 text-xs mb-2 leading-relaxed">
                Lascia la tua opinione: bastano solo 2 minuti.
              </p>
              {description && (
                <div
                  className="prte text-gray-400 text-xs mb-4 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: description }}
                />
              )}
              <div className="mt-6 space-y-2">
                <div className="w-full py-3.5 bg-black text-white text-xs font-medium rounded-xl text-center">
                  Inizia — {total} domande →
                </div>
                <div className="w-full py-2 text-gray-400 text-xs text-center">Più tardi</div>
              </div>
            </div>
          )}

          {/* ── Question ── */}
          {currentQuestion && (
            <div className="flex-1 flex flex-col px-6 py-5">
              <div className="flex justify-between items-center mb-5">
                <span className="text-2xs text-gray-400">{step} / {total}</span>
              </div>

              {currentQuestion.questionText ? (
                <div
                  className="prte text-lg font-medium text-gray-900 leading-snug mb-6"
                  dangerouslySetInnerHTML={{ __html: currentQuestion.questionText }}
                />
              ) : (
                <p className="text-lg font-medium text-gray-300 italic mb-6">Testo domanda...</p>
              )}

              <div className="flex-1">
                {currentQuestion.questionType === 'stars' && (
                  <div className="flex gap-3">
                    {[1,2,3,4,5].map((n) => (
                      <Star key={n} size={30} className="text-gray-200" />
                    ))}
                  </div>
                )}

                {(currentQuestion.questionType === 'single_select' || currentQuestion.questionType === 'multi_select') && (
                  <div className="space-y-2">
                    {currentQuestion.optionsRaw.split('\n').filter(Boolean).map((opt, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 bg-white">
                        <div className={`w-4 h-4 border-2 border-gray-300 flex-shrink-0 ${currentQuestion.questionType === 'multi_select' ? 'rounded' : 'rounded-full'}`} />
                        <span className="text-xs text-gray-700">{opt}</span>
                      </div>
                    ))}
                    {!currentQuestion.optionsRaw.trim() && (
                      <p className="text-2xs text-gray-300 italic">Nessuna opzione inserita</p>
                    )}
                  </div>
                )}

                {currentQuestion.questionType === 'text' && (
                  <div className="p-3 border border-gray-200 rounded-xl bg-white min-h-[80px] flex items-start">
                    <span className="text-xs text-gray-300 italic">Testo libero...</span>
                  </div>
                )}
              </div>

              <div className="w-full py-3.5 bg-black text-white text-xs font-medium rounded-xl text-center mt-6">
                {step === total ? 'Invia risposte' : 'Avanti →'}
              </div>
            </div>
          )}

          {/* ── Thank you ── */}
          {step === total + 1 && (
            <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 text-center">
              <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mb-5 text-xl">
                ✓
              </div>
              <h1 className="font-display text-xl font-light text-gray-900 mb-3">Grazie!</h1>
              <p className="text-gray-500 text-xs leading-relaxed max-w-[200px]">
                Il tuo feedback è prezioso. Continueremo a migliorare l'app.
              </p>
            </div>
          )}
        </div>

        {/* Step dots */}
        <div className="flex items-center justify-center gap-1.5 py-3 border-t border-border bg-white flex-shrink-0">
          {Array.from({ length: total + 2 }, (_, i) => i).map((s) => (
            <button
              key={s}
              onClick={() => setStep(s)}
              className={`rounded-full transition-all duration-200 ${s === step ? 'w-4 h-2 bg-black' : 'w-2 h-2 bg-gray-200 hover:bg-gray-300'}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
