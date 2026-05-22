'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, CheckCircle, AlertCircle, X, ArrowRight } from 'lucide-react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';

interface ImportRow {
  code: string;
  name: string;
  description?: string;
  category?: string;
  costPrice: number | string;
  retailPrice: number | string;
  lotSize?: number | string;
  notes?: string;
  imageUrl?: string;
  famiglia?: string;
  sottofamiglia?: string;
  colore?: string;
  nomLinea?: string;
  misura?: string;
  produttore?: string;
  [key: string]: any;
}

interface ImportResult {
  created: number;
  updated: number;
  errors: Array<{ row: number; message: string; data?: ImportRow }>;
}

// Column mapping: field → accepted header names (all lowercase, trimmed)
const COLUMN_ALIASES: Record<string, string[]> = {
  code:               ['codice', 'code', 'sku', 'cod', 'product_code', 'article'],
  name:               ['descrizione', 'nome', 'name', 'description_short', 'title'],
  produttore:         ['produttore', 'manufacturer', 'brand', 'supplier', 'fornitore'],
  misura:             ['misure', 'misura', 'size', 'dimensions', 'dimension', 'taglia'],
  gruppoMerceologico: ['gruppomerceologico', 'gruppo merceologico', 'product group', 'gruppo_merceologico'],
  famiglia:           ['famiglia', 'family', 'product_family', 'macro_categoria'],
  classe:             ['classe', 'class'],
  sottoclasse:        ['sottoclasse', 'subclass', 'sub_classe'],
  gruppoOmogeneo:     ['gruppoomogeneo', 'gruppo omogeneo', 'gruppo_omogeneo'],
  nomLinea:           ['linea', 'line', 'nomlinea', 'nom_linea', 'nome_linea', 'nome linea'],
  stagione:           ['stagione', 'season'],
  collezione:         ['collezione', 'collection'],
  colore:             ['colore', 'color', 'colour', 'col'],
  temaColore:         ['temacolore', 'tema colore', 'tema_colore'],
  lotSize:            ['confezione', 'lotsize', 'lot_size', 'moq', 'min_qty', 'lot', 'minimum'],
  iva:                ['iva'],
  costPrice:          ['prezzocosto', 'prezzo costo', 'cost price', 'cost_price', 'cost', 'prezzo_costo', 'wholesale'],
  retailPrice:        ['prezzovendita', 'prezzo vendita', 'retail price', 'retail_price', 'retail', 'prezzo', 'msrp'],
  fasciaRicarico:     ['fasciaricarico', 'fascia ricarico', 'fascia_ricarico'],
  fasciaSconto:       ['fasciasconto', 'fascia sconto', 'fascia_sconto'],
  tranche:            ['tranche'],
  notes:              ['note', 'notes', 'comments', 'info'],
  isActive:           ['attivo', 'active', 'is_active'],
  description:        ['description', 'desc', 'long_description'],
  category:           ['category', 'categoria', 'cat', 'group'],
  imageUrl:           ['image_url', 'image', 'img', 'photo_url', 'foto', 'imageurl'],
  sottofamiglia:      ['sottofamiglia', 'subfamily', 'sub_family', 'sub_categoria'],
};

const FIELD_LABELS: Record<string, string> = {
  code:               'Codice',
  name:               'Nome',
  costPrice:          'Prezzo costo i.e.',
  retailPrice:        'Prezzo vendita i.i.',
  produttore:         'Produttore',
  misura:             'Misure',
  gruppoMerceologico: 'Gruppo merceologico',
  famiglia:           'Famiglia',
  classe:             'Classe',
  sottoclasse:        'Sottoclasse',
  gruppoOmogeneo:     'Gruppo omogeneo',
  nomLinea:           'Linea',
  stagione:           'Stagione',
  collezione:         'Collezione',
  colore:             'Colore',
  temaColore:         'Tema colore',
  lotSize:            'Confezione',
  iva:                'IVA (%)',
  fasciaRicarico:     'Fascia di ricarico',
  fasciaSconto:       'Fascia di sconto',
  tranche:            'Tranche',
  notes:              'Note',
  isActive:           'Attivo',
  description:        'Descrizione',
  category:           'Categoria',
  imageUrl:           'URL Immagine',
  sottofamiglia:      'Sottofamiglia',
};

function mapColumn(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
    const found = headers.find((h) =>
      aliases.some((a) => h.toLowerCase().trim() === a)
    );
    if (found) mapping[field] = found;
  }
  return mapping;
}

function applyMapping(row: any, mapping: Record<string, string>): ImportRow {
  const result: any = {};
  for (const [field, header] of Object.entries(mapping)) {
    result[field] = row[header];
  }
  return result;
}

interface ProductImportProps {
  onSuccess: () => void;
}

export default function ProductImport({ onSuccess }: ProductImportProps) {
  const [file, setFile] = useState<File | null>(null);
  const [rawRows, setRawRows] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<ImportRow[]>([]);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [step, setStep] = useState<'upload' | 'map' | 'preview' | 'done'>('upload');

  const { data: collectionsData } = useQuery({
    queryKey: ['collections-for-import'],
    queryFn: async () => {
      // We don't have a collections endpoint yet, use products to find collectionId
      const res = await fetch('/api/products?limit=1');
      const json = await res.json();
      return json.data?.[0]?.collectionId || null;
    },
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const f = acceptedFiles[0];
    if (!f) return;
    setFile(f);
    parseFile(f);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    maxFiles: 1,
  });

  function parseFile(f: File) {
    const ext = f.name.split('.').pop()?.toLowerCase();

    if (ext === 'csv') {
      Papa.parse(f, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const hdrs = results.meta.fields || [];
          const rows = results.data as any[];
          setHeaders(hdrs);
          setRawRows(rows);
          const mapping = mapColumn(hdrs);
          setColumnMapping(mapping);
          setStep('map');
        },
        error: () => toast.error('Impossibile leggere il file CSV'),
      });
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const wb = XLSX.read(e.target?.result, { type: 'binary' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(ws) as any[];
          if (rows.length === 0) { toast.error('File vuoto'); return; }
          const hdrs = Object.keys(rows[0]);
          setHeaders(hdrs);
          setRawRows(rows);
          const mapping = mapColumn(hdrs);
          setColumnMapping(mapping);
          setStep('map');
        } catch {
          toast.error('Impossibile leggere il file Excel');
        }
      };
      reader.readAsBinaryString(f);
    }
  }

  function applyAndPreview() {
    const mapped = rawRows.slice(0, 100).map((r) => applyMapping(r, columnMapping));
    setPreview(mapped);
    setStep('preview');
  }

  async function handleImport() {
    setIsImporting(true);
    try {
      const rows = rawRows.map((r) => applyMapping(r, columnMapping));

      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rows,
          collectionId: collectionsData || null,
        }),
      });

      if (!res.ok) throw new Error('Import failed');

      const data: ImportResult = await res.json();
      setResult(data);
      setStep('done');

      const total = data.created + data.updated;
      if (total > 0) {
        toast.success(`${data.created} creati, ${data.updated} aggiornati`);
        onSuccess();
      }
    } catch (err: any) {
      toast.error(err.message || 'Importazione fallita');
    } finally {
      setIsImporting(false);
    }
  }

  function reset() {
    setFile(null);
    setRawRows([]);
    setHeaders([]);
    setColumnMapping({});
    setPreview([]);
    setResult(null);
    setStep('upload');
  }

  // Step: Upload
  if (step === 'upload') {
    return (
      <div>
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all ${
            isDragActive ? 'border-accent bg-cream' : 'border-border hover:border-gray-400 hover:bg-cream/50'
          }`}
        >
          <input {...getInputProps()} />
          <Upload size={32} className="mx-auto text-gray-300 mb-4" />
          <p className="text-sm font-medium text-primary mb-1">
            {isDragActive ? 'Rilascia il file qui' : 'Trascina il file qui'}
          </p>
          <p className="text-xs text-gray-400">CSV, XLSX o XLS · fino a 10.000 righe</p>
          <button className="mt-4 px-4 py-2 text-xs font-semibold bg-primary text-background rounded hover:bg-warm-darker transition-colors">
            Sfoglia File
          </button>
        </div>

        <div className="mt-6 p-4 bg-cream rounded border border-border">
          <p className="text-xs font-medium text-primary mb-2">Colonne riconosciute:</p>
          <div className="flex flex-wrap gap-1.5">
            {['codice *', 'descrizione *', 'prezzoCosto *', 'prezzoVendita *', 'produttore', 'misure', 'gruppoMerceologico', 'famiglia', 'classe', 'sottoclasse', 'gruppoOmogeneo', 'linea', 'stagione', 'collezione', 'colore', 'temaColore', 'confezione', 'iva', 'fasciaRicarico', 'fasciaSconto', 'tranche', 'note', 'attivo'].map((col) => (
              <span key={col} className="px-2 py-0.5 bg-white border border-border rounded text-2xs text-gray-600 font-mono">
                {col}
              </span>
            ))}
          </div>
          <p className="text-2xs text-gray-400 mt-2">Le intestazioni vengono rilevate automaticamente (case-insensitive). Codice esistente → aggiornamento. Nuovo codice → creazione.</p>
        </div>
      </div>
    );
  }

  // Step: Map
  if (step === 'map') {
    const requiredFields = ['code', 'name', 'costPrice', 'retailPrice'];
    const optionalFields = [
      'produttore', 'misura', 'gruppoMerceologico', 'famiglia', 'classe', 'sottoclasse',
      'gruppoOmogeneo', 'nomLinea', 'stagione', 'collezione', 'colore', 'temaColore',
      'lotSize', 'iva', 'fasciaRicarico', 'fasciaSconto', 'tranche', 'notes', 'isActive',
      'description', 'category', 'imageUrl', 'sottofamiglia',
    ];
    const allFields = [...requiredFields, ...optionalFields];

    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-medium text-primary">{file?.name}</p>
            <p className="text-xs text-gray-400">{rawRows.length} righe rilevate</p>
          </div>
          <button onClick={reset} className="text-gray-400 hover:text-primary">
            <X size={16} />
          </button>
        </div>

        <p className="text-xs font-medium text-primary mb-3">Mappa colonne:</p>
        <div className="space-y-2 mb-6">
          {allFields.map((field) => (
            <div key={field} className="flex items-center gap-3">
              <span className="text-xs w-44 flex-shrink-0">
                {FIELD_LABELS[field] ?? field}
                {requiredFields.includes(field) && <span className="text-red-400"> *</span>}
              </span>
              <select
                value={columnMapping[field] || ''}
                onChange={(e) => setColumnMapping({ ...columnMapping, [field]: e.target.value })}
                className="flex-1 text-xs border border-border rounded px-3 py-1.5 focus:outline-none focus:border-accent bg-white"
              >
                <option value="">— non mappata —</option>
                {headers.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
              {columnMapping[field] ? (
                <CheckCircle size={14} className="text-green-500 flex-shrink-0" />
              ) : (
                <div className="w-3.5" />
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={reset}>Indietro</Button>
          <Button
            onClick={applyAndPreview}
            disabled={!columnMapping.code || !columnMapping.name || !columnMapping.costPrice || !columnMapping.retailPrice}
            icon={<ArrowRight size={13} />}
          >
            Anteprima
          </Button>
        </div>
      </div>
    );
  }

  // Step: Preview
  if (step === 'preview') {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-medium text-primary">
            Anteprima — {rawRows.length} righe da importare
          </p>
          <button onClick={() => setStep('map')} className="text-xs text-gray-400 hover:text-primary">
            ← Torna alla mappatura
          </button>
        </div>

        <div className="overflow-auto max-h-64 border border-border rounded">
          <table className="w-full text-xs">
            <thead className="sticky top-0">
              <tr className="bg-cream border-b border-border">
                <th className="text-left px-3 py-2 text-2xs uppercase tracking-wide text-gray-500">Codice</th>
                <th className="text-left px-3 py-2 text-2xs uppercase tracking-wide text-gray-500">Nome</th>
                <th className="text-left px-3 py-2 text-2xs uppercase tracking-wide text-gray-500">Categoria</th>
                <th className="text-right px-3 py-2 text-2xs uppercase tracking-wide text-gray-500">Costo</th>
                <th className="text-right px-3 py-2 text-2xs uppercase tracking-wide text-gray-500">Vendita</th>
                <th className="text-center px-3 py-2 text-2xs uppercase tracking-wide text-gray-500">CONF</th>
              </tr>
            </thead>
            <tbody>
              {preview.map((row, i) => (
                <tr key={i} className="border-b border-border/50 last:border-0 hover:bg-cream/30">
                  <td className="px-3 py-2 font-mono text-gray-500">{row.code || <span className="text-red-400">MANCANTE</span>}</td>
                  <td className="px-3 py-2 text-primary">{row.name || <span className="text-red-400">MANCANTE</span>}</td>
                  <td className="px-3 py-2 text-gray-500">{row.category || '—'}</td>
                  <td className="px-3 py-2 text-right">€{row.costPrice}</td>
                  <td className="px-3 py-2 text-right">€{row.retailPrice}</td>
                  <td className="px-3 py-2 text-center">{row.lotSize || 1}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {rawRows.length > 100 && (
          <p className="text-xs text-gray-400 mt-2">Mostrando le prime 100 righe di {rawRows.length}</p>
        )}

        <div className="flex justify-end gap-3 mt-4">
          <Button variant="ghost" onClick={() => setStep('map')}>Indietro</Button>
          <Button
            onClick={handleImport}
            loading={isImporting}
          >
            Importa {rawRows.length} Prodotti
          </Button>
        </div>
      </div>
    );
  }

  // Step: Done
  if (step === 'done' && result) {
    const totalDone = result.created + result.updated;
    return (
      <div>
        <div className="flex items-center gap-3 mb-4">
          {totalDone > 0 ? (
            <CheckCircle size={24} className="text-green-500" />
          ) : (
            <AlertCircle size={24} className="text-red-500" />
          )}
          <div>
            <p className="font-medium text-primary">Importazione completata</p>
            <p className="text-sm text-gray-500">
              {result.created} prodotti creati · {result.updated} aggiornati · {result.errors.length} errori
            </p>
          </div>
        </div>

        {result.errors.length > 0 && (
          <div className="border border-red-100 rounded mb-4 overflow-auto max-h-48">
            <p className="px-4 py-2 text-xs font-medium text-red-600 border-b border-red-100 bg-red-50">
              {result.errors.length} errori
            </p>
            {result.errors.map((err, i) => (
              <div key={i} className="px-4 py-2 border-b border-red-50 last:border-0">
                <p className="text-xs text-red-600">Riga {err.row}: {err.message}</p>
                {err.data?.code && (
                  <p className="text-2xs text-gray-400">Codice: {err.data.code}</p>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={reset}>Importa un altro file</Button>
          <Button onClick={onSuccess}>Fine</Button>
        </div>
      </div>
    );
  }

  return null;
}
