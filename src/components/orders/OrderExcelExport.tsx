'use client';

import { useState } from 'react';
import { FileSpreadsheet, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface Props {
  orderId: string;
  className?: string;
}

export default function OrderExcelExport({ orderId, className }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/export-excel`);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const disposition = res.headers.get('Content-Disposition') ?? '';
      const filename = disposition.match(/filename="([^"]+)"/)?.[1]
        ?? `Ordine-${orderId.slice(0, 8).toUpperCase()}-completo.xlsx`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Excel generato');
    } catch {
      toast.error('Errore nella generazione del file Excel');
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className={
        className ??
        'flex items-center gap-1.5 px-3 py-2 text-xs border border-border rounded hover:bg-cream transition-colors text-gray-600 hover:text-primary disabled:opacity-50 flex-shrink-0'
      }
    >
      {loading ? <Loader2 size={12} className="animate-spin" /> : <FileSpreadsheet size={12} />}
      <span className="hidden sm:inline">{loading ? 'Generazione...' : 'Esporta Excel completo'}</span>
      <span className="sm:hidden">Excel</span>
    </button>
  );
}
