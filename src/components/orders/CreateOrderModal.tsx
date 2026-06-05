'use client';

import { useState, useEffect } from 'react';
import { Loader2, Send, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCurrency } from '@/lib/utils';
import type { Destinazione } from '@/types';

interface Props {
  destinazioni: Destinazione[];
  onClose: () => void;
  /** Chiamata solo quando dest + budget sono entrambi definiti e validi */
  onSubmit: (canaleId: string, budget: number) => void;
  submitting: boolean;
}

/**
 * Modal unificato per la creazione di un nuovo ordine.
 * Step 1: selezione destinazione (+ inline creazione nuova)
 * Step 2: scelta budget — obbligatoria, nessuna pre-selezione
 *   - se la destinazione ha un budget: card mantieni / card modifica
 *   - se non ce l'ha: input diretto obbligatorio
 * Il tasto "Crea Ordine" è disabilitato finché entrambi gli step non sono completi.
 */
export function CreateOrderModal({ destinazioni: initialDestinazioni, onClose, onSubmit, submitting }: Props) {
  const [localDestinazioni, setLocalDestinazioni] = useState<Destinazione[]>(initialDestinazioni);
  const [selectedCanaleId, setSelectedCanaleId] = useState(initialDestinazioni[0]?.id ?? '');
  // null = nessuna scelta fatta; il tasto rimane bloccato
  const [budgetChoice, setBudgetChoice] = useState<'mantieni' | 'personalizza' | null>(null);
  const [budgetCustom, setBudgetCustom] = useState('');
  const [showNewDest, setShowNewDest] = useState(false);
  const [newTipo, setNewTipo] = useState('BOTTEGA');
  const [newCitta, setNewCitta] = useState('');
  const [creatingDest, setCreatingDest] = useState(false);

  const selectedDest = localDestinazioni.find(d => d.id === selectedCanaleId) ?? null;
  const destBudget = selectedDest?.budget ?? null;

  // Ogni cambio di destinazione azzera la scelta budget: l'utente deve scegliere di nuovo
  useEffect(() => {
    setBudgetChoice(null);
    setBudgetCustom(destBudget != null ? String(destBudget) : '');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCanaleId]);

  async function handleCreateDest() {
    if (!newTipo) return;
    setCreatingDest(true);
    try {
      const res = await fetch('/api/catalog/destinazioni', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: newTipo, citta: newCitta || null }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Errore');
      const newDest: Destinazione = body.data;
      setLocalDestinazioni(prev => [...prev, newDest]);
      setSelectedCanaleId(newDest.id);
      setShowNewDest(false);
      setNewTipo('BOTTEGA');
      setNewCitta('');
    } catch (e: any) {
      toast.error(e.message || 'Errore creazione destinazione');
    } finally {
      setCreatingDest(false);
    }
  }

  const budgetFinal: number =
    budgetChoice === 'mantieni' && destBudget != null
      ? destBudget
      : parseFloat(budgetCustom);

  const canSubmit =
    !!selectedCanaleId &&
    budgetChoice !== null &&
    !isNaN(budgetFinal) &&
    budgetFinal > 0;

  function handleSubmit() {
    if (canSubmit) onSubmit(selectedCanaleId, budgetFinal);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-white w-full sm:max-w-md sm:rounded-lg shadow-xl max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <p className="text-sm font-semibold text-primary">Crea ordine</p>
          <button onClick={onClose} className="text-gray-400 hover:text-primary transition-colors p-1">
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-5 space-y-5">

          {/* Step 1 — Destinazione */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wide">
              1 — Destinazione *
            </label>
            <select
              value={selectedCanaleId}
              onChange={e => setSelectedCanaleId(e.target.value)}
              className="w-full h-9 border border-border rounded px-3 text-sm text-primary focus:outline-none focus:ring-1 focus:ring-accent bg-white"
            >
              {localDestinazioni.length === 0 && <option value="">— Nessuna destinazione —</option>}
              {localDestinazioni.map(d => (
                <option key={d.id} value={d.id}>
                  {d.nome || d.tipo}{d.citta ? ` — ${d.citta}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Nuova destinazione inline */}
          {!showNewDest ? (
            <button
              type="button"
              onClick={() => setShowNewDest(true)}
              className="text-xs text-accent hover:text-accent/80 transition-colors flex items-center gap-1 -mt-2"
            >
              <span>+</span> Nuova destinazione
            </button>
          ) : (
            <div className="bg-cream/50 border border-border rounded p-3 space-y-2 -mt-2">
              <p className="text-xs font-medium text-gray-600">Nuova destinazione</p>
              <select
                value={newTipo}
                onChange={e => setNewTipo(e.target.value)}
                className="w-full h-8 border border-border rounded px-2 text-xs text-primary focus:outline-none bg-white"
              >
                {['BOTTEGA', 'EMPORIO', 'STORE', 'OUTLET', 'FIERA', 'ONLINE', 'ALTRO'].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <input
                type="text"
                value={newCitta}
                onChange={e => setNewCitta(e.target.value)}
                placeholder="Città (opzionale)"
                className="w-full h-8 border border-border rounded px-2 text-xs text-primary focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <div className="flex gap-2">
                <button type="button"
                  onClick={() => { setShowNewDest(false); setNewTipo('BOTTEGA'); setNewCitta(''); }}
                  className="flex-1 h-8 text-xs border border-border rounded text-gray-500 hover:bg-cream transition-colors"
                >
                  Annulla
                </button>
                <button type="button"
                  onClick={handleCreateDest}
                  disabled={creatingDest}
                  className="flex-1 h-8 text-xs bg-primary text-background rounded hover:bg-warm-darker transition-colors disabled:opacity-50"
                >
                  {creatingDest ? 'Creazione...' : 'Crea'}
                </button>
              </div>
            </div>
          )}

          {/* Step 2 — Budget ordine (obbligatorio, scelta esplicita) */}
          {selectedCanaleId && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-3 uppercase tracking-wide">
                2 — Budget per questo ordine *
              </label>

              {destBudget != null ? (
                <div className="space-y-2">
                  {/* Opzione A: usa budget della destinazione */}
                  <button
                    type="button"
                    onClick={() => setBudgetChoice('mantieni')}
                    className={`w-full flex items-center gap-3 p-3 border-2 rounded-lg text-left transition-colors ${
                      budgetChoice === 'mantieni'
                        ? 'border-accent bg-accent/5'
                        : 'border-border hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                      budgetChoice === 'mantieni' ? 'border-accent' : 'border-gray-300'
                    }`}>
                      {budgetChoice === 'mantieni' && <div className="w-2 h-2 rounded-full bg-accent" />}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-primary">Usa il budget della destinazione</p>
                      <p className="text-sm font-bold text-accent mt-0.5">{formatCurrency(destBudget)}</p>
                    </div>
                  </button>

                  {/* Opzione B: imposta budget diverso */}
                  <button
                    type="button"
                    onClick={() => setBudgetChoice('personalizza')}
                    className={`w-full flex items-start gap-3 p-3 border-2 rounded-lg text-left transition-colors ${
                      budgetChoice === 'personalizza'
                        ? 'border-accent bg-accent/5'
                        : 'border-border hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center mt-0.5 ${
                      budgetChoice === 'personalizza' ? 'border-accent' : 'border-gray-300'
                    }`}>
                      {budgetChoice === 'personalizza' && <div className="w-2 h-2 rounded-full bg-accent" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-primary mb-2">Imposta un budget diverso per questo ordine</p>
                      <div className="relative" onClick={e => e.stopPropagation()}>
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">€</span>
                        <input
                          type="number"
                          min="0"
                          step="100"
                          value={budgetCustom}
                          onChange={e => { setBudgetCustom(e.target.value); setBudgetChoice('personalizza'); }}
                          onFocus={() => setBudgetChoice('personalizza')}
                          placeholder={String(destBudget)}
                          className="w-full pl-6 pr-3 py-1.5 bg-white border border-border rounded text-xs text-primary focus:outline-none focus:border-accent"
                        />
                      </div>
                    </div>
                  </button>

                  {!budgetChoice && (
                    <p className="text-2xs text-orange-500 font-medium text-center pt-1">
                      ↑ Seleziona un&apos;opzione per continuare
                    </p>
                  )}
                </div>
              ) : (
                /* Nessun budget di destinazione: input diretto obbligatorio */
                <div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">€</span>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={budgetCustom}
                      onChange={e => {
                        setBudgetCustom(e.target.value);
                        if (!budgetChoice) setBudgetChoice('personalizza');
                      }}
                      placeholder="es. 3000"
                      autoFocus
                      className="w-full pl-7 pr-3 h-9 border border-border rounded text-sm text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                  </div>
                  <p className="text-2xs text-gray-400 mt-1">La destinazione non ha un budget predefinito.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 text-xs border border-border rounded text-gray-500 hover:bg-cream transition-colors"
          >
            Annulla
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className="flex-1 py-2.5 text-xs bg-primary text-background rounded hover:bg-warm-darker transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
          >
            {submitting
              ? <><Loader2 size={11} className="animate-spin" /> Creazione…</>
              : <><Send size={11} /> Crea Ordine</>}
          </button>
        </div>
      </div>
    </div>
  );
}
