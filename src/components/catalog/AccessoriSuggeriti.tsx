'use client';

import { useQuery } from '@tanstack/react-query';
import { Box, ExternalLink } from 'lucide-react';

interface Supporto {
  id: string;
  name: string;
  codice: string | null;
  retailPrice: number | null;
  costPrice: number | null;
  misura: string | null;
  imageUrl: string | null;
  note: string | null;
  colore: string | null;
  linkAcquisto: string | null;
  tipo: string;
  tipoLabel: string;
}

// Normalizza classe o sottofamiglia → chiave categoria (deve corrispondere alla TIPO_MAP dell'API)
function categoriaGioiello(classe: string | null | undefined, sottofamiglia: string | null | undefined): string | null {
  for (const val of [classe, sottofamiglia]) {
    if (!val) continue;
    const s = val.toLowerCase();
    if (s.includes('collana') || s.includes('collane')) return 'collana';
    if (s.includes('bracciale') || s.includes('bracciali')) return 'bracciale';
    if (s.includes('orecchino') || s.includes('orecchini')) return 'orecchini';
    if (s.includes('anello') || s.includes('anelli')) return 'anello';
  }
  return null;
}

function euro(n: number | null) {
  if (n == null) return null;
  return '€ ' + n.toFixed(2).replace('.', ',');
}

interface Props {
  classe: string | null | undefined;
  sottofamiglia: string | null | undefined;
}

export default function AccessoriSuggeriti({ classe, sottofamiglia }: Props) {
  const tipo = categoriaGioiello(classe, sottofamiglia);

  const { data: items = [] } = useQuery<Supporto[]>({
    queryKey: ['supporti-consigliati', tipo],
    enabled: tipo !== null,
    queryFn: async () => {
      const res = await fetch(`/api/accessori-vendita?tipo=${tipo}`);
      if (!res.ok) return [];
      const body = await res.json();
      return body.data ?? [];
    },
    staleTime: 10 * 60 * 1000,
  });

  if (!tipo || items.length === 0) return null;

  return (
    <div className="mt-8 pt-8 border-t border-border">
      <div className="flex items-center gap-2 mb-4">
        <Box size={14} className="text-gray-400" />
        <h2 className="text-xs font-semibold tracking-widest uppercase text-gray-400">Supporti espositivi consigliati</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {items.map((item) => (
          <div key={item.id} className="flex gap-3 p-3 rounded-xl border border-border bg-cream/50 hover:bg-cream transition-colors">
            {/* Immagine */}
            <div className="w-14 h-14 flex-shrink-0 rounded-lg overflow-hidden border border-border bg-white flex items-center justify-center">
              {item.imageUrl
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                : <Box size={16} className="text-gray-200" />}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">
                {item.tipoLabel}{item.codice ? ` · ${item.codice}` : ''}
              </p>
              <p className="text-sm font-medium text-primary leading-tight">{item.name}</p>
              {item.colore && <p className="text-xs text-gray-400 mt-0.5">{item.colore}</p>}
              {item.misura && <p className="text-xs text-gray-400">{item.misura}</p>}
              {euro(item.retailPrice) && (
                <p className="text-sm font-semibold text-primary mt-1">{euro(item.retailPrice)}</p>
              )}
              {item.note && (
                <p className="text-xs text-gray-400 italic mt-0.5 line-clamp-2">{item.note}</p>
              )}
              {item.linkAcquisto && (
                <a
                  href={item.linkAcquisto}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-2 px-3 py-1 bg-primary text-white text-xs rounded-full hover:opacity-90 transition-opacity"
                >
                  <ExternalLink size={10} /> Ordina su Demetra
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
