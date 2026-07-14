'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Database, ChevronDown, HelpCircle } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import type { Order } from '@/types';
import toast from 'react-hot-toast';

interface Props {
  order: Order;
  onExported?: () => void;
}

function download(data: string | ArrayBuffer, filename: string, mime: string) {
  const blob = new Blob([data], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function markExported(orderId: string) {
  await fetch(`/api/orders/${orderId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'ESPORTATO' }),
  });
}

const DEMETRA_STEPS = [
  { key: 1, text: <>Vai in <strong>Proposte di prenotazione</strong> › <strong>Proposte attive</strong> › <strong>Nuova prenotazione</strong>, compila i campi e clicca <strong>Crea prenotazione</strong> (Cliente: <strong>Prenotazioni dirette</strong>).</> },
  { key: 2, text: <>Nella finestra successiva inserisci la destinazione e gli altri campi, poi clicca il pulsante blu <strong>Carica da file</strong>.</> },
  { key: 3, text: <>Si apre una nuova finestra. Clicca il pulsante grigio <strong>Scegli file</strong> e seleziona il CSV o XLSX scaricato dall&apos;app.</> },
  { key: 4, text: <>Clicca il pulsante verde <strong>Carica da file</strong>. In fondo premi <strong>Inserisci</strong> per aggiungere gli articoli (o <strong>Annulla</strong>).</> },
  { key: 5, text: <>Clicca <strong>Conferma e invia</strong> per confermare la prenotazione.</> },
];

export default function OrderDemetraExport({ order, onExported }: Props) {
  const queryClient = useQueryClient();
  const [pos, setPos] = useState<{ top?: number; bottom?: number; right: number } | null>(null);
  const [helpPos, setHelpPos] = useState<{ top?: number; bottom?: number; right: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const helpBtnRef = useRef<HTMLButtonElement>(null);
  const shortId = order.orderNumber ?? order.id.slice(0, 8).toUpperCase();
  const items = order.items ?? [];
  const tranchePresenti = [...new Set(
    items.map(it => (it.product as any)?.tranche as string | undefined).filter((t): t is string => Boolean(t))
  )];

  useEffect(() => {
    if (!pos) return;
    function onMouseDown() { setPos(null); }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [pos]);

  useEffect(() => {
    if (!helpPos) return;
    function onMouseDown() { setHelpPos(null); }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [helpPos]);

  function toggleMenu(e: React.MouseEvent) {
    e.stopPropagation();
    if (pos) { setPos(null); return; }
    setHelpPos(null);
    const rect = btnRef.current!.getBoundingClientRect();
    const right = window.innerWidth - rect.right;
    // Open upward when closer to bottom half of screen
    if (rect.bottom > window.innerHeight / 2) {
      setPos({ bottom: window.innerHeight - rect.top + 4, right });
    } else {
      setPos({ top: rect.bottom + 4, right });
    }
  }

  function toggleHelp(e: React.MouseEvent) {
    e.stopPropagation();
    if (helpPos) { setHelpPos(null); return; }
    setPos(null);
    const rect = helpBtnRef.current!.getBoundingClientRect();
    const right = window.innerWidth - rect.right;
    if (rect.bottom > window.innerHeight / 2) {
      setHelpPos({ bottom: window.innerHeight - rect.top + 4, right });
    } else {
      setHelpPos({ top: rect.bottom + 4, right });
    }
  }

  async function handleCSV(e: React.MouseEvent, tranche?: string) {
    e.stopPropagation();
    setPos(null);
    const filtered = tranche ? items.filter(it => (it.product as any)?.tranche === tranche) : items;
    const lines = [
      'Codice;Quantità',
      ...filtered.map((it) => `${it.product?.code ?? ''};${it.quantity}`),
    ];
    const filename = tranche
      ? `Demetra-${shortId}-${tranche}.csv`
      : `Demetra-${shortId}-completo.csv`;
    // UTF-8 BOM so Italian Excel opens it correctly
    download('﻿' + lines.join('\r\n'), filename, 'text/csv;charset=utf-8;');
    toast.success(`CSV ${tranche ?? 'completo'} pronto`);
    await markExported(order.id);
    queryClient.invalidateQueries({ queryKey: ['my-orders'] });
    onExported?.();
  }

  async function handleXLSX(e: React.MouseEvent) {
    e.stopPropagation();
    setPos(null);
    try {
      const XLSX = await import('xlsx');
      const rows = [
        ['Codice', 'Quantità'],
        ...items.map((it) => [it.product?.code ?? '', it.quantity]),
      ];
      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws['!cols'] = [{ wch: 20 }, { wch: 12 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Demetra');
      const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
      download(
        buf,
        `ordine-demetra-${shortId}.xlsx`,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      toast.success('Excel Demetra pronto');
      await markExported(order.id);
      queryClient.invalidateQueries({ queryKey: ['my-orders'] });
      onExported?.();
    } catch {
      toast.error('Errore nella generazione');
    }
  }

  return (
    <>
      <button
        ref={btnRef}
        onClick={toggleMenu}
        className="text-xs bg-black text-white border border-black rounded px-2 py-1.5 hover:bg-gray-800 transition-all flex items-center gap-1"
      >
        <Database size={11} />
        <span className="hidden sm:inline">Esporta in Demetra</span>
        <ChevronDown
          size={9}
          className={`transition-transform duration-150 ${pos ? (pos.bottom != null ? '' : 'rotate-180') : ''}`}
        />
      </button>

      {/* Help button */}
      <button
        ref={helpBtnRef}
        onClick={toggleHelp}
        title="Come importare in Demetra"
        className={`flex items-center justify-center w-6 h-[30px] rounded border transition-colors ${helpPos ? 'border-gray-400 text-gray-700 bg-gray-50' : 'border-border text-gray-400 hover:text-gray-600 hover:border-gray-400'}`}
      >
        <HelpCircle size={12} />
      </button>

      {/* Export dropdown portal */}
      {pos &&
        createPortal(
          <div
            style={{ position: 'fixed', top: pos.top, bottom: pos.bottom, right: pos.right, zIndex: 9999 }}
            className="bg-white border border-border rounded shadow-luxury overflow-hidden min-w-[160px]"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <button
              onClick={(e) => handleCSV(e)}
              className="flex items-center w-full text-left px-4 py-2.5 text-xs text-primary hover:bg-cream transition-colors"
            >
              {tranchePresenti.length <= 1 ? 'CSV' : 'CSV completo'}
            </button>
            {tranchePresenti.length > 1 && tranchePresenti.map((tr) => (
              <button
                key={tr}
                onClick={(e) => handleCSV(e, tr)}
                className="flex items-center w-full text-left px-4 py-2.5 text-xs text-gray-600 hover:bg-cream transition-colors"
              >
                CSV tranche {tr}
              </button>
            ))}
            <div className="border-t border-border/50" />
            <button
              onClick={handleXLSX}
              className="flex items-center w-full text-left px-4 py-2.5 text-xs text-primary hover:bg-cream transition-colors"
            >
              Excel (.xlsx)
            </button>
          </div>,
          document.body
        )}

      {/* Help tooltip portal */}
      {helpPos &&
        createPortal(
          <div
            style={{ position: 'fixed', top: helpPos.top, bottom: helpPos.bottom, right: helpPos.right, zIndex: 9999 }}
            className="bg-white border border-border rounded shadow-luxury p-4 w-[288px]"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <p className="text-2xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Come importare in Demetra</p>
            <ol className="space-y-2.5">
              {DEMETRA_STEPS.map(({ key, text }) => (
                <li key={key} className="flex gap-2.5 text-xs text-gray-600 leading-relaxed">
                  <span className="flex-shrink-0 w-4 h-4 rounded-full bg-gray-100 text-gray-500 text-2xs font-semibold flex items-center justify-center mt-0.5">{key}</span>
                  <span>{text}</span>
                </li>
              ))}
            </ol>
          </div>,
          document.body
        )}
    </>
  );
}
