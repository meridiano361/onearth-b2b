'use client';

import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, CheckCircle, AlertCircle, X, ArrowRight } from 'lucide-react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import Button from '@/components/ui/Button';
import toast from 'react-hot-toast';

// ─── Constants ────────────────────────────────────────────────────────────────

const LS_KEY = 'import-fields-v1';

const COLUMN_ALIASES: Record<string, string[]> = {
  code:               ['codice', 'code', 'sku', 'cod', 'product_code', 'article'],
  name:               ['descrizione', 'nome', 'name', 'description_short', 'title'],
  produttore:         ['produttore', 'manufacturer', 'brand', 'supplier', 'fornitore'],
  paese:              ['paese', 'country', 'paese_origine', 'nazione'],
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
  imageUrl:           ['image_url', 'image', 'img', 'photo_url', 'foto', 'imageurl'],
};

const FIELD_LABELS: Record<string, string> = {
  name:               'Descrizione / Nome',
  produttore:         'Produttore',
  paese:              'Paese',
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
  tranche:            'Tranche',
  lotSize:            'Confezione',
  iva:                'IVA',
  costPrice:          'Prezzo costo i.e.',
  retailPrice:        'Prezzo vendita i.i.',
  fasciaRicarico:     'Fascia ricarico',
  fasciaSconto:       'Fascia sconto',
  notes:              'Note',
  isActive:           'Attivo',
  imageUrl:           'URL Immagine',
};

const FIELD_GROUPS: { label: string; fields: string[] }[] = [
  { label: 'Dati base',       fields: ['name', 'produttore', 'paese', 'misura'] },
  { label: 'Classificazione', fields: ['gruppoMerceologico', 'famiglia', 'classe', 'sottoclasse', 'gruppoOmogeneo', 'nomLinea', 'stagione', 'collezione', 'colore', 'temaColore', 'tranche'] },
  { label: 'Prezzi',          fields: ['costPrice', 'retailPrice', 'fasciaRicarico', 'fasciaSconto'] },
  { label: 'Logistica',       fields: ['lotSize', 'iva'] },
  { label: 'Altro',           fields: ['notes', 'isActive', 'imageUrl'] },
];

const ALL_UPDATABLE = FIELD_GROUPS.flatMap((g) => g.fields);

const PRESETS: { label: string; fields: string[] }[] = [
  { label: 'Solo prezzi',          fields: ['costPrice', 'retailPrice', 'fasciaRicarico', 'fasciaSconto'] },
  { label: 'Solo classificazione', fields: ['gruppoMerceologico', 'famiglia', 'classe', 'sottoclasse', 'gruppoOmogeneo', 'nomLinea', 'stagione', 'collezione', 'tranche'] },
  { label: 'Solo logistica',       fields: ['lotSize', 'iva', 'paese', 'produttore'] },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mapColumn(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
    const found = headers.find((h) => aliases.some((a) => h.toLowerCase().trim() === a));
    if (found) mapping[field] = found;
  }
  return mapping;
}

function applyMapping(row: any, mapping: Record<string, string>): Record<string, any> {
  const result: any = {};
  for (const [field, header] of Object.entries(mapping)) {
    result[field] = row[header];
  }
  return result;
}

function formatVal(v: any): string {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'Sì' : 'No';
  return String(v);
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = 'upload' | 'select' | 'preview' | 'done';

interface PreviewRow {
  codice: string | null;
  trovato: boolean;
  campi: Record<string, { corrente: any; nuovo: any }>;
}

interface PreviewData {
  preview: PreviewRow[];
  trovati: number;
  nonTrovati: number;
  nonTrovatiCodes: string[];
}

interface ImportResult {
  updated: number;
  notFound: string[];
  campiAggiornati: string[];
  errors: Array<{ codice: string; message: string }>;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProductImport({ onSuccess }: { onSuccess: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [rawRows, setRawRows] = useState<any[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set(['collezione', 'tranche']));
  const [step, setStep] = useState<Step>('upload');
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) {
        const arr = JSON.parse(saved) as string[];
        if (Array.isArray(arr) && arr.length > 0) setSelectedFields(new Set(arr));
      }
    } catch { /* ignore */ }
  }, []);

  function savePrefs(fields: Set<string>) {
    try { localStorage.setItem(LS_KEY, JSON.stringify([...fields])); } catch { /* ignore */ }
  }

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
          setRawRows(results.data as any[]);
          setColumnMapping(mapColumn(results.meta.fields ?? []));
          setStep('select');
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
          setRawRows(rows);
          setColumnMapping(mapColumn(Object.keys(rows[0])));
          setStep('select');
        } catch {
          toast.error('Impossibile leggere il file Excel');
        }
      };
      reader.readAsBinaryString(f);
    }
  }

  function toggleField(field: string) {
    setSelectedFields((prev) => {
      const next = new Set(prev);
      if (next.has(field)) next.delete(field); else next.add(field);
      savePrefs(next);
      return next;
    });
  }

  function applyPreset(fields: string[]) {
    const next = new Set(fields.filter((f) => columnMapping[f]));
    setSelectedFields(next);
    savePrefs(next);
  }

  function selectAll() {
    const next = new Set(ALL_UPDATABLE.filter((f) => columnMapping[f]));
    setSelectedFields(next);
    savePrefs(next);
  }

  function deselectAll() {
    setSelectedFields(new Set());
    savePrefs(new Set());
  }

  function reset() {
    setFile(null);
    setRawRows([]);
    setColumnMapping({});
    setPreviewData(null);
    setResult(null);
    setStep('upload');
  }

  const activeFields = [...selectedFields].filter((f) => columnMapping[f]);

  async function loadPreview() {
    setIsLoadingPreview(true);
    try {
      const mappedRows = rawRows.map((r) => applyMapping(r, columnMapping));
      const res = await fetch('/api/admin/products/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: mappedRows, campiDaAggiornare: activeFields, dryRun: true }),
      });
      if (!res.ok) throw new Error('Errore nel caricamento anteprima');
      setPreviewData(await res.json());
      setStep('preview');
    } catch (err: any) {
      toast.error(err.message || 'Errore nel caricamento anteprima');
    } finally {
      setIsLoadingPreview(false);
    }
  }

  async function handleImport() {
    setIsImporting(true);
    try {
      const mappedRows = rawRows.map((r) => applyMapping(r, columnMapping));
      const res = await fetch('/api/admin/products/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: mappedRows, campiDaAggiornare: activeFields, dryRun: false }),
      });
      if (!res.ok) throw new Error('Importazione fallita');
      const data: ImportResult = await res.json();
      setResult(data);
      setStep('done');
      if (data.updated > 0) {
        toast.success(`${data.updated} prodotti aggiornati`);
        onSuccess();
      }
    } catch (err: any) {
      toast.error(err.message || 'Importazione fallita');
    } finally {
      setIsImporting(false);
    }
  }

  // ─── Step 1: Upload ─────────────────────────────────────────────────────────

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

        <div className="mt-4 p-4 bg-cream rounded border border-border">
          <p className="text-xs font-medium text-primary mb-1.5">Colonne riconosciute automaticamente:</p>
          <div className="flex flex-wrap gap-1">
            {['codice *', 'descrizione', 'produttore', 'paese', 'misure', 'linea', 'stagione', 'collezione', 'colore', 'temaColore', 'tranche', 'confezione', 'iva', 'prezzoCosto', 'prezzoVendita', 'fasciaRicarico', 'fasciaSconto', 'note', 'attivo'].map((col) => (
              <span key={col} className="px-2 py-0.5 bg-white border border-border rounded text-2xs text-gray-600 font-mono">{col}</span>
            ))}
          </div>
          <p className="text-2xs text-gray-400 mt-2">Le intestazioni vengono rilevate automaticamente. Dopo il caricamento sceglierai quali campi aggiornare.</p>
        </div>
      </div>
    );
  }

  // ─── Step 2: Select fields ──────────────────────────────────────────────────

  if (step === 'select') {
    const detectedCount = ALL_UPDATABLE.filter((f) => columnMapping[f]).length;

    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-medium text-primary">{file?.name}</p>
            <p className="text-xs text-gray-400">{rawRows.length} righe · {detectedCount} colonne rilevate</p>
          </div>
          <button onClick={reset} className="text-gray-400 hover:text-primary"><X size={16} /></button>
        </div>

        <p className="text-sm font-semibold text-primary mb-1">Scegli cosa aggiornare</p>
        <p className="text-xs text-gray-400 mb-3">
          Verranno aggiornati solo i campi selezionati per i prodotti trovati tramite codice.
          I campi grigi non sono presenti nel file caricato.
        </p>

        {/* Quick-select */}
        <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b border-border">
          <button onClick={selectAll} className="px-3 py-1 text-xs border border-border rounded hover:bg-cream transition-colors">
            Seleziona tutti
          </button>
          <button onClick={deselectAll} className="px-3 py-1 text-xs border border-border rounded hover:bg-cream transition-colors">
            Deseleziona tutti
          </button>
          {PRESETS.map(({ label, fields }) => (
            <button key={label} onClick={() => applyPreset(fields)} className="px-3 py-1 text-xs border border-border rounded hover:bg-cream transition-colors">
              {label}
            </button>
          ))}
        </div>

        {/* Field groups */}
        <div className="space-y-5 mb-5">
          {FIELD_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="text-2xs font-semibold uppercase tracking-widest text-gray-400 mb-2">{group.label}</p>
              <div className="grid grid-cols-2 gap-1.5">
                {group.fields.map((field) => {
                  const available = !!columnMapping[field];
                  const checked = available && selectedFields.has(field);
                  return (
                    <label
                      key={field}
                      className={`flex items-center gap-2 px-3 py-2 rounded border transition-colors ${
                        !available
                          ? 'border-border/40 opacity-35 cursor-not-allowed select-none'
                          : checked
                            ? 'border-gray-800 bg-gray-50 cursor-pointer'
                            : 'border-border hover:border-gray-400 hover:bg-cream/30 cursor-pointer'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={!available}
                        onChange={() => available && toggleField(field)}
                        className="w-3.5 h-3.5 accent-gray-900 flex-shrink-0"
                      />
                      <span className="text-xs text-primary flex-1 truncate">{FIELD_LABELS[field] ?? field}</span>
                      {available && (
                        <span className="text-2xs text-gray-400 font-mono truncate max-w-[72px]" title={columnMapping[field]}>
                          {columnMapping[field]}
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-border">
          <p className="text-xs text-gray-400">
            {activeFields.length} campo{activeFields.length !== 1 ? 'i' : ''} selezionat{activeFields.length !== 1 ? 'i' : 'o'}
          </p>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={reset}>Annulla</Button>
            <Button
              onClick={loadPreview}
              loading={isLoadingPreview}
              disabled={activeFields.length === 0}
              icon={<ArrowRight size={13} />}
            >
              Anteprima
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Step 3: Preview ────────────────────────────────────────────────────────

  if (step === 'preview' && previewData) {
    const visibleFields = activeFields;

    return (
      <div>
        {/* Badges */}
        <div className="flex flex-wrap gap-2 mb-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 text-xs rounded-full border border-green-200">
            <CheckCircle size={12} />
            {previewData.trovati} prodotti trovati
          </span>
          {previewData.nonTrovati > 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 text-xs rounded-full border border-amber-200">
              <AlertCircle size={12} />
              {previewData.nonTrovati} codici non trovati
            </span>
          )}
          <span className="inline-flex items-center px-3 py-1 bg-gray-50 text-gray-500 text-xs rounded-full border border-border">
            Anteprima prime 10 righe
          </span>
        </div>

        {/* Non trovati */}
        {previewData.nonTrovatiCodes.length > 0 && (
          <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded text-xs">
            <p className="font-medium text-amber-800 mb-1">Codici non trovati nel database (verranno ignorati):</p>
            <p className="text-amber-700 font-mono break-all">
              {previewData.nonTrovatiCodes.slice(0, 20).join(', ')}
              {previewData.nonTrovatiCodes.length > 20 ? ` +${previewData.nonTrovatiCodes.length - 20} altri` : ''}
            </p>
          </div>
        )}

        {/* Preview table */}
        <div className="overflow-auto max-h-72 border border-border rounded mb-4">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-cream z-10">
              <tr className="border-b border-border">
                <th className="text-left px-3 py-2 text-2xs uppercase tracking-wide text-gray-500 font-semibold whitespace-nowrap">
                  Codice
                </th>
                {visibleFields.map((f) => (
                  <th key={f} className="text-left px-3 py-2 text-2xs uppercase tracking-wide text-gray-500 font-semibold whitespace-nowrap">
                    {FIELD_LABELS[f] ?? f}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {previewData.preview.map((row, i) => (
                <tr key={i} className={`border-b border-border/50 last:border-0 ${!row.trovato ? 'opacity-40' : ''}`}>
                  <td className="px-3 py-2 font-mono text-gray-500 whitespace-nowrap">
                    {row.codice ?? '—'}
                    {!row.trovato && <span className="ml-1 text-2xs text-amber-500">(non trovato)</span>}
                  </td>
                  {visibleFields.map((f) => {
                    const diff = row.campi[f];
                    if (!diff) return <td key={f} className="px-3 py-2 text-gray-300">—</td>;
                    const corrStr = formatVal(diff.corrente);
                    const nuovoStr = formatVal(diff.nuovo);
                    const changed = corrStr !== nuovoStr;
                    return (
                      <td key={f} className={`px-3 py-2 ${changed ? 'bg-amber-50' : 'bg-green-50/40'}`}>
                        {changed ? (
                          <span className="flex items-center gap-1 flex-wrap">
                            <span className="text-gray-400 line-through">{corrStr}</span>
                            <span className="text-gray-300">→</span>
                            <span className="font-medium text-primary">{nuovoStr}</span>
                          </span>
                        ) : (
                          <span className="text-gray-500">{nuovoStr}</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400">
            Verranno aggiornati <strong className="text-primary">{previewData.trovati}</strong> prodotti
            su {rawRows.length} righe · {visibleFields.length} campi
          </p>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => setStep('select')}>← Modifica selezione</Button>
            <Button
              onClick={handleImport}
              loading={isImporting}
              disabled={previewData.trovati === 0}
            >
              Conferma e importa
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Step 4: Done ───────────────────────────────────────────────────────────

  if (step === 'done' && result) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-5">
          {result.updated > 0 ? (
            <CheckCircle size={24} className="text-green-500 flex-shrink-0" />
          ) : (
            <AlertCircle size={24} className="text-amber-500 flex-shrink-0" />
          )}
          <div>
            <p className="font-medium text-primary">Importazione completata</p>
            <p className="text-sm text-gray-500">
              {result.updated} aggiornati · {result.notFound.length} non trovati · {result.errors.length} errori
            </p>
          </div>
        </div>

        {/* Campi aggiornati */}
        <div className="mb-4 p-3 bg-gray-50 border border-border rounded">
          <p className="text-xs font-medium text-gray-600 mb-2">Campi aggiornati:</p>
          <div className="flex flex-wrap gap-1.5">
            {result.campiAggiornati.map((f) => (
              <span key={f} className="px-2 py-0.5 bg-white border border-border text-xs text-primary rounded">
                {FIELD_LABELS[f] ?? f}
              </span>
            ))}
          </div>
        </div>

        {/* Codici non trovati */}
        {result.notFound.length > 0 && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded">
            <p className="text-xs font-medium text-amber-800 mb-1">
              Codici non trovati nel database ({result.notFound.length}):
            </p>
            <p className="text-xs text-amber-700 font-mono break-all">
              {result.notFound.slice(0, 30).join(', ')}
              {result.notFound.length > 30 ? ` +${result.notFound.length - 30} altri` : ''}
            </p>
          </div>
        )}

        {/* Errori */}
        {result.errors.length > 0 && (
          <div className="mb-4 border border-red-100 rounded overflow-auto max-h-40">
            <p className="px-4 py-2 text-xs font-medium text-red-600 border-b border-red-100 bg-red-50">
              {result.errors.length} errori
            </p>
            {result.errors.map((err, i) => (
              <div key={i} className="px-4 py-2 border-b border-red-50 last:border-0">
                <p className="text-xs text-red-600">
                  <span className="font-mono">{err.codice}</span>: {err.message}
                </p>
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
