'use client';

import { useState } from 'react';
import { FileText } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import toast from 'react-hot-toast';
import type { Order } from '@/types';

interface Props {
  order: Order;
}

const GROUPING_OPTIONS: { value: string; label: string }[] = [
  { value: 'gruppoMerceologico', label: 'Gruppo merceologico' },
  { value: 'famiglia', label: 'Famiglia' },
  { value: 'classe', label: 'Classe' },
  { value: 'sottoclasse', label: 'Sottoclasse' },
  { value: 'gruppoOmogeneo', label: 'Gruppo omogeneo' },
  { value: 'nomLinea', label: 'Linea' },
  { value: 'stagione', label: 'Stagione' },
  { value: 'collezione', label: 'Collezione' },
  { value: 'colore', label: 'Colore' },
  { value: 'temaColore', label: 'Tema colore' },
];

export default function OrderPDFExport({ order }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [grouping, setGrouping] = useState('collezione');
  const [generating, setGenerating] = useState(false);

  async function handleGenerate() {
    setGenerating(true);
    try {
      const res = await fetch(
        `/api/orders/${order.id}/pdf-classification?groupBy=${grouping}`
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Errore');
      }
      const blob = await res.blob();
      const label = grouping.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const filename = `ordine-${order.id.slice(0, 8)}-per-${label}.pdf`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('PDF pronto');
      setIsOpen(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Errore nella generazione del PDF');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <>
      <button
        onClick={(e) => { e.stopPropagation(); setIsOpen(true); }}
        className="text-xs text-gray-400 hover:text-primary border border-border rounded px-2 py-1.5 hover:bg-cream transition-all flex items-center gap-1"
      >
        <FileText size={11} />
        <span className="hidden sm:inline">PDF</span>
      </button>

      <Modal
        isOpen={isOpen}
        onClose={() => { if (!generating) setIsOpen(false); }}
        title="Esporta PDF ordine"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsOpen(false)} disabled={generating}>
              Annulla
            </Button>
            <Button onClick={handleGenerate} loading={generating}>
              Scarica PDF
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <div className="p-3 bg-cream rounded border border-border/60">
            <p className="text-2xs font-medium uppercase tracking-widest text-gray-400 mb-0.5">Ordine</p>
            <p className="text-sm font-medium text-primary">
              #{order.id.slice(0, 8).toUpperCase()}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {order.items?.length ?? 0} righe · {order.totalItems} pz
            </p>
          </div>

          <div>
            <label className="text-xs font-medium text-primary block mb-1.5">
              Raggruppa prodotti per
            </label>
            <select
              value={grouping}
              onChange={(e) => setGrouping(e.target.value)}
              disabled={generating}
              className="w-full text-sm border border-border rounded px-3 py-2 focus:outline-none focus:border-accent bg-white transition-colors"
            >
              {GROUPING_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1.5">
              I prodotti verranno raggruppati per{' '}
              <span className="font-medium text-primary">
                {GROUPING_OPTIONS.find((o) => o.value === grouping)?.label.toLowerCase()}
              </span>
              , con subtotale per ogni gruppo.
            </p>
          </div>
        </div>
      </Modal>
    </>
  );
}
