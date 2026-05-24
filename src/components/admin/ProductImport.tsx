'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, CheckCircle, AlertCircle, X, ArrowRight, Check } from 'lucide-react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import Button from '@/components/ui/Button';
import toast from 'react-hot-toast';

// ─── Column recognition ───────────────────────────────────────────────────────

// Flat map: normalized header → internal field name
const COLUMN_MAP: Record<string, string> = {
  // Codice
  'codice': 'code', 'code': 'code', 'cod': 'code',
  'codice prodotto': 'code', 'product code': 'code', 'article': 'code', 'sku': 'code',

  // Descrizione / Nome
  'nome': 'name', 'name': 'name', 'descrizione': 'name',
  'description': 'name', 'nome prodotto': 'name', 'product name': 'name',
  'desc': 'name', 'description short': 'name', 'title': 'name',

  // Produttore
  'produttore': 'produttore', 'manufacturer': 'produttore', 'brand': 'produttore',
  'fornitore': 'produttore', 'supplier': 'produttore',

  // Paese
  'paese': 'paese', 'country': 'paese', 'paese origine': 'paese',
  'paese di origine': 'paese', 'origin': 'paese', 'nazione': 'paese',

  // Misure
  'misure': 'misura', 'misura': 'misura', 'size': 'misura',
  'dimensioni': 'misura', 'dimensions': 'misura', 'dim': 'misura', 'taglia': 'misura',

  // Linea
  'linea': 'nomLinea', 'line': 'nomLinea', 'nome linea': 'nomLinea',
  'linea prodotto': 'nomLinea', 'nomlinea': 'nomLinea',

  // Colore
  'colore': 'colore', 'color': 'colore', 'colour': 'colore',

  // Tema colore
  'tema colore': 'temaColore', 'temacolore': 'temaColore',
  'tema': 'temaColore', 'color theme': 'temaColore',

  // Collezione
  'collezione': 'collezione', 'collection': 'collezione', 'coll': 'collezione',

  // Stagione
  'stagione': 'stagione', 'season': 'stagione',

  // Gruppo merceologico
  'gruppo merceologico': 'gruppoMerceologico', 'gruppomerceologico': 'gruppoMerceologico',
  'gruppo merc': 'gruppoMerceologico', 'product group': 'gruppoMerceologico',

  // Famiglia
  'famiglia': 'famiglia', 'family': 'famiglia',

  // Classe
  'classe': 'classe', 'class': 'classe',

  // Sottoclasse
  'sottoclasse': 'sottoclasse', 'subclass': 'sottoclasse',
  'sotto classe': 'sottoclasse', 'sub class': 'sottoclasse',
  'sottofamiglia': 'sottoclasse', 'sub family': 'sottoclasse',

  // Gruppo omogeneo
  'gruppo omogeneo': 'gruppoOmogeneo', 'gruppoomogeneo': 'gruppoOmogeneo',
  'omogeneo': 'gruppoOmogeneo', 'homogeneous group': 'gruppoOmogeneo',

  // Confezione / lotto
  'confezione': 'lotSize', 'conf': 'lotSize', 'lotto': 'lotSize',
  'lot size': 'lotSize', 'lotsize': 'lotSize', 'pz per collo': 'lotSize',
  'quantita minima': 'lotSize', 'qty': 'lotSize', 'moq': 'lotSize',
  'min qty': 'lotSize', 'minimum': 'lotSize',

  // Tranche
  'tranche': 'tranche',

  // Prezzo costo
  'prezzo costo ie': 'costPrice', 'prezzo costo i e': 'costPrice',
  'prezzo costo': 'costPrice', 'costo': 'costPrice', 'costo ie': 'costPrice',
  'cost price': 'costPrice', 'cost': 'costPrice', 'prezzo acquisto': 'costPrice',
  'p costo': 'costPrice', 'prezzo netto': 'costPrice', 'wholesale': 'costPrice',

  // Prezzo vendita
  'prezzo vendita ii': 'retailPrice', 'prezzo vendita i i': 'retailPrice',
  'prezzo vendita': 'retailPrice', 'vendita': 'retailPrice', 'pvp': 'retailPrice',
  'retail price': 'retailPrice', 'prezzo consigliato': 'retailPrice', 'msrp': 'retailPrice',
  'p vendita': 'retailPrice', 'retail': 'retailPrice',

  // IVA
  'iva': 'iva', 'vat': 'iva', 'tax': 'iva',

  // Fascia ricarico
  'fascia ricarico': 'fasciaRicarico', 'fasciaricarico': 'fasciaRicarico',
  'ricarico': 'fasciaRicarico', 'markup': 'fasciaRicarico',

  // Fascia sconto
  'fascia sconto': 'fasciaSconto', 'fasciasconto': 'fasciaSconto',
  'sconto': 'fasciaSconto', 'discount': 'fasciaSconto',

  // Note
  'note': 'notes', 'notes': 'notes', 'note prodotto': 'notes',
  'comments': 'notes', 'info': 'notes',

  // Attivo
  'attivo': 'isActive', 'active': 'isActive', 'visibile': 'isActive', 'is active': 'isActive',

  // Immagine
  'immagine': 'imageUrl', 'image': 'imageUrl', 'foto': 'imageUrl',
  'url immagine': 'imageUrl', 'imageurl': 'imageUrl', 'image url': 'imageUrl',
  'img': 'imageUrl', 'photo url': 'imageUrl',
};

function normalizeHeader(h: string): string {
  return h
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\./g, '')
    .replace(/[/_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function mapHeader(h: string): string | null {
  return COLUMN_MAP[normalizeHeader(h)] ?? null;
}

function detectColumns(headers: string[]): {
  mapping: Record<string, string>;
  unrecognized: string[];
} {
  const mapping: Record<string, string> = {};
  const unrecognized: string[] = [];
  for (const h of headers) {
    const field = mapHeader(h);
    if (field) {
      if (!mapping[field]) mapping[field] = h; // first match wins
    } else {
      unrecognized.push(h);
    }
  }
  return { mapping, unrecognized };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const LS_KEY = 'import-fields-v1';

const FIELD_LABELS: Record<string, string> = {
  code:               'Codice prodotto',
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
  { label: 'Dati base',       fields: ['code', 'name', 'produttore', 'paese', 'misura'] },
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

type Azione = 'aggiorna' | 'nuovo' | 'ignora';

interface PreviewRow {
  codice: string | null;
  trovato: boolean;
  azione: Azione;
  motivoIgnora?: string;
  campi: Record<string, { corrente: any; nuovo: any }>;
}

interface PreviewData {
  preview: PreviewRow[];
  trovati: number;
  nonTrovati: number;
  nonTrovatiCodes: string[];
  aggiornamenti: number;
  nuovi: number;
  ignorati: number;
}

interface ImportResult {
  updated: number;
  created: number;
  skipped: number;
  notFound: string[];
  campiAggiornati: string[];
  errors: Array<{ codice: string; message: string }>;
  newProductIds?: string[];
}

interface RecognitionLog {
  auto: Array<{ header: string; field: string; label: string }>;
  manual: Array<{ header: string; field: string; label: string }>;
  ignored: string[];
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProductImport({ onSuccess }: { onSuccess: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [rawRows, setRawRows] = useState<any[]>([]);
  const [autoMapping, setAutoMapping] = useState<Record<string, string>>({});
  const [unrecognizedHeaders, setUnrecognizedHeaders] = useState<string[]>([]);
  const [manualOverrides, setManualOverrides] = useState<Record<string, string>>({});
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set(['collezione', 'tranche']));
  const [step, setStep] = useState<Step>('upload');
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [recognitionLog, setRecognitionLog] = useState<RecognitionLog | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [modalita, setModalita] = useState<'upsert' | 'solo-aggiorna' | 'solo-crea'>('upsert');
  const [applicaSelezioneCampiAiNuovi, setApplicaSelezioneCampiAiNuovi] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) {
        const arr = JSON.parse(saved) as string[];
        if (Array.isArray(arr) && arr.length > 0) setSelectedFields(new Set(arr));
      }
    } catch { /* ignore */ }
  }, []);

  // Combined mapping: auto-detected + manual overrides for fields not already auto-detected
  const effectiveMapping = useMemo(() => {
    const m = { ...autoMapping };
    for (const [header, field] of Object.entries(manualOverrides)) {
      if (field && !m[field]) m[field] = header;
    }
    return m;
  }, [autoMapping, manualOverrides]);

  const activeFields = useMemo(
    () => [...selectedFields].filter((f) => effectiveMapping[f]),
    [selectedFields, effectiveMapping]
  );

  function savePrefs(fields: Set<string>) {
    try { localStorage.setItem(LS_KEY, JSON.stringify([...fields])); } catch { /* ignore */ }
  }

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const f = acceptedFiles[0];
    if (!f) return;
    setFile(f);
    parseFile(f);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    maxFiles: 1,
  });

  function initFromHeaders(headers: string[]) {
    const { mapping, unrecognized } = detectColumns(headers);
    setAutoMapping(mapping);
    setUnrecognizedHeaders(unrecognized);
    setManualOverrides({});
  }

  function parseFile(f: File) {
    const ext = f.name.split('.').pop()?.toLowerCase();
    if (ext === 'csv') {
      Papa.parse(f, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const headers = results.meta.fields ?? [];
          setRawRows(results.data as any[]);
          initFromHeaders(headers);
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
          initFromHeaders(Object.keys(rows[0]));
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
    const next = new Set(fields.filter((f) => effectiveMapping[f]));
    setSelectedFields(next);
    savePrefs(next);
  }

  function selectAll() {
    const next = new Set(ALL_UPDATABLE.filter((f) => f !== 'code' && effectiveMapping[f]));
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
    setAutoMapping({});
    setUnrecognizedHeaders([]);
    setManualOverrides({});
    setPreviewData(null);
    setResult(null);
    setRecognitionLog(null);
    setStep('upload');
  }

  function buildRecognitionLog(): RecognitionLog {
    const auto = Object.entries(autoMapping)
      .filter(([field]) => field !== 'code' && ALL_UPDATABLE.includes(field))
      .map(([field, header]) => ({ header, field, label: FIELD_LABELS[field] ?? field }));

    // Manual overrides that are actually effective (field not already auto-detected)
    const manual = Object.entries(manualOverrides)
      .filter(([_, field]) => !!field && !autoMapping[field])
      .map(([header, field]) => ({ header, field, label: FIELD_LABELS[field] ?? field }));

    const manualMappedHeaders = new Set(
      Object.entries(manualOverrides).filter(([_, f]) => !!f && !autoMapping[f]).map(([h]) => h)
    );
    const ignored = unrecognizedHeaders.filter((h) => !manualMappedHeaders.has(h));

    return { auto, manual, ignored };
  }

  async function loadPreview() {
    setIsLoadingPreview(true);
    try {
      const mappedRows = rawRows.map((r) => applyMapping(r, effectiveMapping));
      const res = await fetch('/api/admin/products/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: mappedRows, campiDaAggiornare: activeFields, dryRun: true, modalita, applicaSelezioneCampiAiNuovi }),
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
      const mappedRows = rawRows.map((r) => applyMapping(r, effectiveMapping));
      const res = await fetch('/api/admin/products/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: mappedRows, campiDaAggiornare: activeFields, dryRun: false, modalita, applicaSelezioneCampiAiNuovi }),
      });
      if (!res.ok) throw new Error('Importazione fallita');
      const data: ImportResult = await res.json();
      setResult(data);
      setRecognitionLog(buildRecognitionLog());
      setStep('done');
      if (data.updated > 0 || (data.created ?? 0) > 0) {
        const parts: string[] = [];
        if (data.updated > 0) parts.push(`${data.updated} aggiornati`);
        if ((data.created ?? 0) > 0) parts.push(`${data.created} creati`);
        toast.success(parts.join(', '));
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
          <p className="text-xs font-medium text-primary mb-1.5">Riconoscimento colonne automatico</p>
          <p className="text-2xs text-gray-400">
            Le intestazioni vengono rilevate in modo flessibile (case-insensitive, con tutti gli alias comuni: "Prezzo costo i.e.", "cost price", "costo", ecc.).
            Le colonne non riconosciute potranno essere mappate manualmente nel passo successivo.
          </p>
        </div>
      </div>
    );
  }

  // ─── Step 2: Select fields ──────────────────────────────────────────────────

  if (step === 'select') {
    const autoUpdatable = Object.entries(autoMapping).filter(([f]) => f !== 'code' && ALL_UPDATABLE.includes(f));
    const hasUnrecognized = unrecognizedHeaders.length > 0;

    return (
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-medium text-primary">{file?.name}</p>
            <p className="text-xs text-gray-400">
              {rawRows.length} righe · {autoUpdatable.length} colonne rilevate
              {hasUnrecognized && ` · ${unrecognizedHeaders.length} non riconosciute`}
            </p>
          </div>
          <button onClick={reset} className="text-gray-400 hover:text-primary"><X size={16} /></button>
        </div>

        {/* ── Modalità importazione ────────────────────────────────────── */}
        <div className="mb-4 p-3 bg-cream rounded border border-border">
          <p className="text-xs font-medium text-primary mb-2">Modalità importazione</p>
          <div className="space-y-1.5">
            {([
              { value: 'upsert',       label: 'Aggiorna + Crea',  desc: 'Aggiorna i prodotti esistenti e crea quelli nuovi' },
              { value: 'solo-aggiorna', label: 'Solo aggiorna',   desc: 'Aggiorna solo i prodotti già nel database, ignora i nuovi codici' },
              { value: 'solo-crea',    label: 'Solo crea',        desc: 'Crea solo i nuovi prodotti, ignora i codici già esistenti' },
            ] as const).map(({ value, label, desc }) => (
              <label key={value} className="flex items-start gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="modalita"
                  value={value}
                  checked={modalita === value}
                  onChange={() => setModalita(value)}
                  className="mt-0.5 accent-gray-900 flex-shrink-0"
                />
                <div>
                  <span className="text-xs font-medium text-primary">{label}</span>
                  <span className="text-xs text-gray-400 ml-1.5">{desc}</span>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* ── Column detection panel ────────────────────────────────────── */}
        <div className="mb-4 border border-border rounded-lg overflow-hidden">
          <div className="px-3 py-2 bg-gray-50 border-b border-border flex items-center gap-2">
            <p className="text-2xs font-semibold uppercase tracking-widest text-gray-500 flex-1">
              Colonne rilevate nel file
            </p>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 border border-green-200 rounded text-2xs text-green-700">
              <Check size={9} />
              {autoUpdatable.length} auto
            </span>
            {hasUnrecognized && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 border border-red-200 rounded text-2xs text-red-600">
                <AlertCircle size={9} />
                {unrecognizedHeaders.length} non riconosciute
              </span>
            )}
          </div>

          {/* Auto-recognized */}
          {autoUpdatable.length > 0 && (
            <div className="px-3 py-2.5 border-b border-border/50">
              <div className="flex flex-wrap gap-1.5">
                {autoUpdatable.map(([field, header]) => (
                  <span
                    key={field}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 border border-green-200 rounded text-2xs"
                    title={`"${header}" → ${field}`}
                  >
                    <Check size={9} className="text-green-600 flex-shrink-0" />
                    <span className="text-gray-500 font-mono max-w-[80px] truncate">{header}</span>
                    <span className="text-gray-300">→</span>
                    <span className="text-green-700 font-medium">{FIELD_LABELS[field] ?? field}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Unrecognized — manual mapping */}
          {hasUnrecognized && (
            <div className="px-3 py-2.5">
              <p className="text-2xs font-medium text-red-600 uppercase tracking-wide mb-2">
                Non riconosciute — mappa manualmente o ignora:
              </p>
              <div className="space-y-1.5">
                {unrecognizedHeaders.map((header) => {
                  const currentVal = manualOverrides[header] ?? '';
                  const isEffective = !!currentVal && !autoMapping[currentVal];
                  return (
                    <div key={header} className="flex items-center gap-2">
                      <AlertCircle size={12} className={`flex-shrink-0 ${isEffective ? 'text-green-500' : 'text-red-400'}`} />
                      <span
                        className="text-xs font-mono text-gray-600 flex-none max-w-[140px] truncate"
                        title={header}
                      >
                        {header}
                      </span>
                      <ArrowRight size={10} className="text-gray-300 flex-shrink-0" />
                      <select
                        value={currentVal}
                        onChange={(e) =>
                          setManualOverrides((prev) => ({ ...prev, [header]: e.target.value }))
                        }
                        className="flex-1 text-xs border border-border rounded px-2 py-1 bg-white outline-none focus:ring-1 focus:ring-gray-900 min-w-0"
                      >
                        <option value="">— Ignora questa colonna —</option>
                        {ALL_UPDATABLE.map((f) => {
                          const alreadyAuto = !!autoMapping[f];
                          return (
                            <option key={f} value={f} disabled={alreadyAuto}>
                              {FIELD_LABELS[f] ?? f}{alreadyAuto ? ' (già rilevata)' : ''}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── Field selection ───────────────────────────────────────────── */}
        <p className="text-sm font-semibold text-primary mb-1">Scegli cosa aggiornare</p>
        <p className="text-xs text-gray-400 mb-3">
          Verranno aggiornati solo i campi selezionati per i prodotti trovati tramite codice.
          I campi grigi non sono presenti nel file caricato.
        </p>

        {(modalita === 'upsert' || modalita === 'solo-crea') && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
            <p className="font-medium mb-1">Per i nuovi prodotti:</p>
            <p>Verranno importati tutti i campi presenti nel file, indipendentemente dalla selezione qui sotto. La selezione si applica solo agli aggiornamenti.</p>
            <label className="flex items-center gap-2 mt-2 cursor-pointer">
              <input
                type="checkbox"
                checked={applicaSelezioneCampiAiNuovi}
                onChange={(e) => setApplicaSelezioneCampiAiNuovi(e.target.checked)}
                className="accent-blue-600"
              />
              <span>Applica la selezione anche ai nuovi prodotti</span>
            </label>
          </div>
        )}

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
                  const available = !!effectiveMapping[field];
                  const isManual = available && !autoMapping[field];
                  const checked = available && selectedFields.has(field);

                  if (field === 'code') {
                    return (
                      <div key="code" className="col-span-2">
                        <label className={`flex items-start gap-2 px-3 py-2.5 rounded border transition-colors ${
                          !available
                            ? 'border-border/40 opacity-35 cursor-not-allowed select-none'
                            : checked
                              ? 'border-orange-400 bg-orange-50 cursor-pointer'
                              : 'border-border hover:border-gray-400 hover:bg-cream/30 cursor-pointer'
                        }`}>
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={!available}
                            onChange={() => available && toggleField(field)}
                            className="w-3.5 h-3.5 accent-orange-500 flex-shrink-0 mt-0.5"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs text-primary font-medium">{FIELD_LABELS[field]}</span>
                              <span className="text-2xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-medium">Chiave di ricerca</span>
                              {available && (
                                <span className={`text-2xs font-mono ${isManual ? 'text-blue-400' : 'text-gray-400'}`}>
                                  {isManual ? '✎ manuale' : effectiveMapping[field]}
                                </span>
                              )}
                            </div>
                            <p className="text-2xs text-gray-400 mt-0.5">
                              Sempre usato come chiave di ricerca. Seleziona solo se vuoi aggiornare il codice nel database.
                            </p>
                            {checked && (
                              <p className="text-2xs text-orange-600 font-medium mt-1">
                                Attenzione: modificare il codice prodotto può causare incongruenze con ordini esistenti. Procedi solo se necessario.
                              </p>
                            )}
                          </div>
                        </label>
                      </div>
                    );
                  }

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
                        <span
                          className={`text-2xs font-mono truncate max-w-[72px] ${isManual ? 'text-blue-400' : 'text-gray-400'}`}
                          title={`${effectiveMapping[field]}${isManual ? ' (manuale)' : ''}`}
                        >
                          {isManual ? '✎ manuale' : effectiveMapping[field]}
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
              disabled={modalita !== 'solo-crea' && activeFields.length === 0}
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
        {/* Counters */}
        <div className="flex flex-wrap gap-2 mb-4">
          {previewData.aggiornamenti > 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 text-xs rounded-full border border-amber-200">
              <CheckCircle size={12} />
              {previewData.aggiornamenti} da aggiornare
            </span>
          )}
          {previewData.nuovi > 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 text-xs rounded-full border border-green-200">
              <CheckCircle size={12} />
              {previewData.nuovi} nuovi da creare
            </span>
          )}
          {previewData.ignorati > 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-50 text-gray-500 text-xs rounded-full border border-border">
              <AlertCircle size={12} />
              {previewData.ignorati} da ignorare
            </span>
          )}
          <span className="inline-flex items-center px-3 py-1 bg-gray-50 text-gray-500 text-xs rounded-full border border-border">
            Anteprima prime 10 righe
          </span>
        </div>

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
                <tr
                  key={i}
                  className={`border-b border-border/50 last:border-0 ${
                    row.azione === 'nuovo' ? 'bg-green-50/30' :
                    row.azione === 'ignora' ? 'opacity-40' : ''
                  }`}
                >
                  <td className="px-3 py-2 font-mono text-gray-500 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span>{row.codice ?? '—'}</span>
                      {row.azione === 'nuovo' && (
                        <span className="text-2xs font-bold text-green-700 bg-green-100 px-1.5 py-0.5 rounded">NUOVO</span>
                      )}
                      {row.azione === 'aggiorna' && (
                        <span className="text-2xs font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">AGGIORNA</span>
                      )}
                      {row.azione === 'ignora' && (
                        <span className="text-2xs font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">IGNORA</span>
                      )}
                    </div>
                  </td>
                  {visibleFields.map((f) => {
                    const diff = row.campi[f];
                    if (!diff) return <td key={f} className="px-3 py-2 text-gray-300">—</td>;
                    const nuovoStr = formatVal(diff.nuovo);
                    if (row.azione === 'nuovo') {
                      return (
                        <td key={f} className="px-3 py-2 bg-green-50/50">
                          <span className="font-medium text-green-800">{nuovoStr}</span>
                        </td>
                      );
                    }
                    const corrStr = formatVal(diff.corrente);
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
            {rawRows.length} righe ·{' '}
            {[
              previewData.aggiornamenti > 0 ? `${previewData.aggiornamenti} da aggiornare` : null,
              previewData.nuovi > 0 ? `${previewData.nuovi} da creare` : null,
              previewData.ignorati > 0 ? `${previewData.ignorati} ignorati` : null,
            ].filter(Boolean).join(' · ')}
          </p>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => setStep('select')}>← Modifica selezione</Button>
            <Button
              onClick={handleImport}
              loading={isImporting}
              disabled={previewData.aggiornamenti === 0 && previewData.nuovi === 0}
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
    const hasSuccess = result.updated > 0 || (result.created ?? 0) > 0;
    return (
      <div>
        <div className="flex items-center gap-3 mb-5">
          {hasSuccess ? (
            <CheckCircle size={24} className="text-green-500 flex-shrink-0" />
          ) : (
            <AlertCircle size={24} className="text-amber-500 flex-shrink-0" />
          )}
          <div>
            <p className="font-medium text-primary">Importazione completata</p>
            <p className="text-sm text-gray-500">
              {[
                result.updated > 0 ? `${result.updated} aggiornati` : null,
                (result.created ?? 0) > 0 ? `${result.created} creati` : null,
                result.notFound.length > 0 ? `${result.notFound.length} non trovati` : null,
                result.errors.length > 0 ? `${result.errors.length} errori` : null,
              ].filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          {result.updated > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded">
              <p className="text-2xl font-light text-amber-700">{result.updated}</p>
              <p className="text-xs text-amber-600 mt-0.5">Prodotti aggiornati</p>
            </div>
          )}
          {(result.created ?? 0) > 0 && (
            <div className="p-3 bg-green-50 border border-green-200 rounded">
              <p className="text-2xl font-light text-green-700">{result.created}</p>
              <p className="text-xs text-green-600 mt-0.5">Nuovi prodotti creati</p>
              <p className="text-2xs text-green-400 mt-0.5">Attivi: No — attivali manualmente</p>
            </div>
          )}
          {(result.skipped ?? 0) > 0 && (
            <div className="p-3 bg-gray-50 border border-border rounded">
              <p className="text-2xl font-light text-gray-500">{result.skipped}</p>
              <p className="text-xs text-gray-400 mt-0.5">Righe ignorate</p>
            </div>
          )}
          {result.errors.length > 0 && (
            <div className="p-3 bg-red-50 border border-red-200 rounded">
              <p className="text-2xl font-light text-red-600">{result.errors.length}</p>
              <p className="text-xs text-red-500 mt-0.5">Errori</p>
            </div>
          )}
        </div>

        {/* Activation link */}
        {(result.created ?? 0) > 0 && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
            Vuoi attivare i nuovi prodotti?{' '}
            <a href="/admin/prodotti?attivi=false" className="underline font-medium hover:text-blue-900">
              Vai ai prodotti non attivi →
            </a>
          </div>
        )}

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

        {/* Recognition log */}
        {recognitionLog && (
          <div className="mb-4 p-3 border border-border rounded space-y-2">
            <p className="text-xs font-medium text-gray-600">Log riconoscimento colonne:</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 bg-green-50 border border-green-100 rounded">
                <p className="text-lg font-semibold text-green-700">{recognitionLog.auto.length}</p>
                <p className="text-2xs text-green-600">Riconosciute auto</p>
              </div>
              <div className="p-2 bg-blue-50 border border-blue-100 rounded">
                <p className="text-lg font-semibold text-blue-700">{recognitionLog.manual.length}</p>
                <p className="text-2xs text-blue-600">Mappate manualmente</p>
              </div>
              <div className="p-2 bg-gray-50 border border-border rounded">
                <p className="text-lg font-semibold text-gray-500">{recognitionLog.ignored.length}</p>
                <p className="text-2xs text-gray-400">Ignorate</p>
              </div>
            </div>
            {recognitionLog.manual.length > 0 && (
              <div className="text-xs text-blue-600 space-y-0.5">
                {recognitionLog.manual.map((m) => (
                  <p key={m.header} className="font-mono">
                    "{m.header}" → {m.label}
                  </p>
                ))}
              </div>
            )}
            {recognitionLog.ignored.length > 0 && (
              <p className="text-2xs text-gray-400">
                Ignorate: {recognitionLog.ignored.map((h) => `"${h}"`).join(', ')}
              </p>
            )}
          </div>
        )}

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
