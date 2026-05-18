'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Database, ChevronDown } from 'lucide-react';
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

export default function OrderDemetraExport({ order, onExported }: Props) {
  const queryClient = useQueryClient();
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const shortId = order.id.slice(0, 8);
  const items = order.items ?? [];

  useEffect(() => {
    if (!pos) return;
    function onMouseDown() { setPos(null); }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [pos]);

  function toggleMenu(e: React.MouseEvent) {
    e.stopPropagation();
    if (pos) { setPos(null); return; }
    const rect = btnRef.current!.getBoundingClientRect();
    setPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
  }

  async function handleCSV(e: React.MouseEvent) {
    e.stopPropagation();
    setPos(null);
    const lines = [
      'Codice;Quantità',
      ...items.map((it) => `${it.product?.code ?? ''};${it.quantity}`),
    ];
    // UTF-8 BOM so Italian Excel opens it correctly
    download('﻿' + lines.join('\r\n'), `ordine-demetra-${shortId}.csv`, 'text/csv;charset=utf-8;');
    toast.success('CSV Demetra pronto');
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
        className="text-xs text-gray-400 hover:text-primary border border-border rounded px-2 py-1.5 hover:bg-cream transition-all flex items-center gap-1"
      >
        <Database size={11} />
        <span className="hidden sm:inline">Esporta in Demetra</span>
        <ChevronDown
          size={9}
          className={`transition-transform duration-150 ${pos ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Render outside overflow-hidden parent via portal */}
      {pos &&
        createPortal(
          <div
            style={{ position: 'fixed', top: pos.top, right: pos.right, zIndex: 9999 }}
            className="bg-white border border-border rounded shadow-luxury overflow-hidden min-w-[140px]"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleCSV}
              className="flex items-center w-full text-left px-4 py-2.5 text-xs text-primary hover:bg-cream transition-colors"
            >
              CSV
            </button>
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
    </>
  );
}
