'use client';

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { FileText } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import toast from 'react-hot-toast';
import type { Order } from '@/types';
import type { PDFGrouping } from './OrderPDFDocument';

interface Props {
  order: Order;
}

const GROUPING_OPTIONS: { value: PDFGrouping; label: string }[] = [
  { value: 'all', label: 'Nessun raggruppamento' },
  { value: 'famiglia', label: 'Famiglia' },
  { value: 'sottofamiglia', label: 'Sottofamiglia' },
  { value: 'nomLinea', label: 'Linea' },
  { value: 'colore', label: 'Colore' },
];

export default function OrderPDFExport({ order }: Props) {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [grouping, setGrouping] = useState<PDFGrouping>('all');
  const [generating, setGenerating] = useState(false);

  async function handleGenerate() {
    setGenerating(true);
    try {
      const [pdfLib, docModule] = await Promise.all([
        import('@react-pdf/renderer'),
        import('./OrderPDFDocument'),
      ]);

      const { pdf } = pdfLib;
      const { OrderPDFDocument } = docModule;
      const customerName = session?.user?.companyName;

      const blob = await pdf(
        React.createElement(OrderPDFDocument, { order, grouping, customerName })
      ).toBlob();

      const suffix = grouping !== 'all' ? `-per-${grouping}` : '';
      const filename = `ordine-${order.id.slice(0, 8)}${suffix}.pdf`;

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
      toast.error('Errore nella generazione del PDF');
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
              onChange={(e) => setGrouping(e.target.value as PDFGrouping)}
              disabled={generating}
              className="w-full text-sm border border-border rounded px-3 py-2 focus:outline-none focus:border-accent bg-white transition-colors"
            >
              {GROUPING_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            {grouping !== 'all' && (
              <p className="text-xs text-gray-400 mt-1.5">
                I prodotti verranno raggruppati per{' '}
                <span className="font-medium text-primary">
                  {GROUPING_OPTIONS.find((o) => o.value === grouping)?.label.toLowerCase()}
                </span>
                , con subtotale per ogni gruppo.
              </p>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
}
