'use client';

// ── Esempio di utilizzo del compositing da componente client ──────────────────
// Mostra la selezione del supporto, genera il compositing e visualizza il risultato.
// Da integrare nel dettaglio prodotto (es. scheda gioiello) o in un pannello admin.

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { SupportoEspositivo, CategoriaGioiello, CompositeResponse } from '@/types/jewelry';
import { LABEL_SUPPORTO, LABEL_CATEGORIA, SUPPORTI_COMPATIBILI } from '@/types/jewelry';

interface Props {
  productId: string;
  productImageUrl: string;  // PNG con sfondo trasparente
  categoria: CategoriaGioiello;
}

export default function CompositePreview({ productId, productImageUrl, categoria }: Props) {
  const [selectedSupportoId, setSelectedSupportoId] = useState<string>('');
  const [result, setResult] = useState<CompositeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Carica solo i supporti compatibili con questa categoria
  const { data: supporti = [] } = useQuery<SupportoEspositivo[]>({
    queryKey: ['jewelry-supporti', categoria],
    queryFn: async () => {
      const res = await fetch('/api/jewelry/supporti');
      if (!res.ok) throw new Error('Errore');
      const json = await res.json();
      // Filtra per categoria compatibile
      return (json.data as SupportoEspositivo[]).filter((s) =>
        SUPPORTI_COMPATIBILI[categoria].includes(s.tipo),
      );
    },
  });

  async function generate() {
    if (!selectedSupportoId) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/jewelry/composite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          productImageUrl,
          supportoId: selectedSupportoId,
          categoria,
        }),
      });
      const json: CompositeResponse = await res.json();
      if (!res.ok || json.stato === 'failed') {
        setError((json as any).errore ?? (json as any).error ?? 'Errore sconosciuto');
      } else {
        setResult(json);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3 p-4 border border-border rounded bg-white">
      <p className="text-xs font-semibold text-primary uppercase tracking-wider">
        Anteprima su supporto — {LABEL_CATEGORIA[categoria]}
      </p>

      {/* Selezione supporto */}
      <div className="flex gap-2 flex-wrap">
        {supporti.map((s) => (
          <button key={s.id} type="button"
            onClick={() => setSelectedSupportoId(s.id)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded border text-xs transition-colors
              ${selectedSupportoId === s.id
                ? 'border-accent text-accent bg-accent/5'
                : 'border-border text-gray-600 hover:border-gray-400'
              }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={s.immagineUrl} alt="" className="w-6 h-6 object-contain" />
            {s.nome}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={generate}
        disabled={!selectedSupportoId || loading}
        className="w-full py-2 text-xs bg-primary text-white rounded hover:bg-primary/90 disabled:opacity-40 transition-colors"
      >
        {loading ? 'Generazione…' : 'Genera anteprima'}
      </button>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>
      )}

      {result?.risultatoUrl && (
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={result.risultatoUrl}
            alt="Anteprima compositing"
            className="w-full rounded border border-border object-contain max-h-80"
          />
        </div>
      )}
    </div>
  );
}

// ── Uso minimo (copia-incolla nel tuo componente prodotto) ────────────────────
//
// import CompositePreview from '@/components/jewelry/CompositePreview';
//
// <CompositePreview
//   productId={product.id}
//   productImageUrl={product.imageUrl}   // deve essere PNG con sfondo trasparente
//   categoria="collana"                  // 'collana' | 'bracciale' | 'orecchino' | 'anello'
// />
