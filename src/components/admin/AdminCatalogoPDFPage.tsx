'use client';

import { useState, useCallback, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BookOpen,
  Download,
  Eye,
  Save,
  Trash2,
  Loader2,
  ChevronDown,
  ChevronUp,
  FolderOpen,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { CatalogFields } from '@/components/admin/CatalogoPDFDocument';

// ── Types ─────────────────────────────────────────────────────────────────────

interface FormState {
  gruppoMerceologico: string;
  famiglia: string;
  classe: string;
  sottoclasse: string;
  gruppoOmogeneo: string;
  nomLinea: string;
  collezione: string;
  colore: string;
  produttore: string;
  tranche: string;
  soloAttivi: boolean;
  raggruppa: string;
  ordina: string;
  campi: CatalogFields;
  titolo: string;
  mostraLogo: boolean;
  mostraData: boolean;
  mostraPagina: boolean;
  // New fields
  formato: 'A4-P' | 'A4-L' | 'A3-P' | 'A3-L';
  colonne: number;
  righe: number;
  margine: 'stretto' | 'normale' | 'ampio';
  colori: {
    sfondoPagina: string;
    sfondoFoto: string;
    testoPrimario: string;
    testoSecondario: string;
  };
  modalitaSeparatore: 'pagina-intera' | 'inline' | 'nuova-riga';
  copertina: {
    attiva: boolean;
    immagineBase64: string | null;
    titolo: string;
    sottotitolo: string;
    layout: 'full-overlay' | 'half' | 'solo-testo';
  };
  paginaFinale: {
    attiva: boolean;
    titolo: string;
    testo: string;
    mostraLogo: boolean;
  };
}

interface Template {
  id: string;
  nome: string;
  configurazione: FormState;
  createdAt: string;
}

interface PreviewResult {
  count: number;
  pages: number;
  productPages: number;
  groupPages: number;
}

// ── Defaults ──────────────────────────────────────────────────────────────────

const DEFAULT_STATE: FormState = {
  gruppoMerceologico: '',
  famiglia: '',
  classe: '',
  sottoclasse: '',
  gruppoOmogeneo: '',
  nomLinea: '',
  collezione: '',
  colore: '',
  produttore: '',
  tranche: '',
  soloAttivi: true,
  raggruppa: '',
  ordina: 'code',
  campi: {
    foto: true,
    codice: true,
    descrizione: true,
    misure: true,
    produttore: true,
    paese: true,
    prezzoCosto: true,
    pvp: true,
    linea: false,
    collezione: false,
    confezione: false,
    iva: false,
  },
  titolo: 'Collezione CASA 2027',
  mostraLogo: true,
  mostraData: true,
  mostraPagina: true,
  formato: 'A4-P',
  colonne: 4,
  righe: 6,
  margine: 'normale',
  colori: {
    sfondoPagina: '#E8DDD0',
    sfondoFoto: '#FFFFFF',
    testoPrimario: '#1C1C1C',
    testoSecondario: '#9CA3AF',
  },
  modalitaSeparatore: 'pagina-intera',
  copertina: {
    attiva: false,
    immagineBase64: null,
    titolo: 'Collezione CASA 2027',
    sottotitolo: '',
    layout: 'full-overlay',
  },
  paginaFinale: {
    attiva: false,
    titolo: '',
    testo: '',
    mostraLogo: true,
  },
};

// ── ON EARTH palette ──────────────────────────────────────────────────────────

const PALETTE = [
  { nome: 'Bianco', hex: '#FFFFFF' },
  { nome: 'Tortora chiaro', hex: '#F5F0EA' },
  { nome: 'Tortora', hex: '#E8DDD0' },
  { nome: 'Beige', hex: '#D4C4B0' },
  { nome: 'Grigio chiaro', hex: '#E5E5E5' },
  { nome: 'Grigio', hex: '#9CA3AF' },
  { nome: 'Nero', hex: '#000000' },
  { nome: 'Verde salvia', hex: '#8FAF8F' },
  { nome: 'Terracotta', hex: '#C17A5A' },
];

// ── Sub-components ─────────────────────────────────────────────────────────────

function SectionTitle({
  children,
  open,
  onToggle,
}: {
  children: React.ReactNode;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-center justify-between w-full px-4 py-3 bg-gray-50 border border-border rounded text-xs font-semibold tracking-widest uppercase text-gray-500 hover:bg-gray-100 transition-colors"
    >
      {children}
      {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
    </button>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder = 'Tutti',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-9 border border-border rounded px-2.5 text-xs bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-primary/30"
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

function CheckboxField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer group">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 rounded border-border accent-primary"
      />
      <span className="text-xs text-gray-700 group-hover:text-primary transition-colors">{label}</span>
    </label>
  );
}

function ColorSwatchPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (hex: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1.5">{label}</label>
      <div className="flex flex-wrap gap-1.5">
        {PALETTE.map((c) => (
          <button
            key={c.hex}
            type="button"
            title={c.nome}
            onClick={() => onChange(c.hex)}
            style={{ backgroundColor: c.hex }}
            className={`w-7 h-7 rounded transition-all ${
              value.toLowerCase() === c.hex.toLowerCase()
                ? 'border-2 border-primary ring-1 ring-primary/30 scale-110'
                : 'border-2 border-transparent hover:border-gray-300'
            } ${c.hex === '#FFFFFF' ? 'border-gray-200' : ''}`}
          />
        ))}
      </div>
      <p className="text-2xs text-gray-400 mt-1">{PALETTE.find(c => c.hex.toLowerCase() === value.toLowerCase())?.nome ?? value}</p>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function AdminCatalogoPDFPage() {
  const [config, setConfig] = useState<FormState>(DEFAULT_STATE);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showTemplates, setShowTemplates] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Section open/close
  const [sections, setSections] = useState({
    filtri: true,
    formato: true,
    colori: false,
    raggruppamento: true,
    campi: true,
    intestazione: true,
    copertina: false,
    paginaFinale: false,
  });

  const toggleSection = (k: keyof typeof sections) =>
    setSections((s) => ({ ...s, [k]: !s[k] }));

  // ── Classification data ────────────────────────────────────────────────────

  const { data: classData } = useQuery({
    queryKey: ['classificazione'],
    queryFn: () => fetch('/api/classificazione').then((r) => r.json()),
    staleTime: 5 * 60_000,
  });

  const { data: produttoriData } = useQuery({
    queryKey: ['produttori'],
    queryFn: () => fetch('/api/admin/produttori').then((r) => r.json()),
    staleTime: 5 * 60_000,
  });

  const { data: optionsData } = useQuery({
    queryKey: ['catalogo-pdf-options'],
    queryFn: () => fetch('/api/admin/catalogo-pdf/options').then((r) => r.json()),
    staleTime: 5 * 60_000,
  });

  const { data: templatesData, refetch: refetchTemplates } = useQuery({
    queryKey: ['catalogo-templates'],
    queryFn: () => fetch('/api/admin/catalogo-pdf/templates').then((r) => r.json()),
  });

  // Derived option lists
  const byType = (tipo: string): string[] =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    classData?.data?.filter((v: any) => v.tipo === tipo).map((v: any) => v.nome) ?? [];

  const gruppiMerceologici = byType('gruppoMerceologico');
  const famiglie = byType('famiglia');
  const classi = byType('classe');
  const sottoclassi = byType('sottoclasse');
  const gruppiOmogenei = byType('gruppoOmogeneo');
  const linee = byType('nomLinea');
  const collezioni = byType('collezione');
  const colori = byType('colore');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const produttori = produttoriData?.data?.map((p: any) => p.nome) ?? [];
  const tranches = optionsData?.tranches ?? [];

  const templates: Template[] = templatesData?.data ?? [];

  // ── Field updaters ─────────────────────────────────────────────────────────

  const set = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (key: keyof FormState, value: any) =>
      setConfig((c) => ({ ...c, [key]: value })),
    []
  );

  const setField = useCallback(
    (key: keyof CatalogFields, value: boolean) =>
      setConfig((c) => ({ ...c, campi: { ...c.campi, [key]: value } })),
    []
  );

  const setColore = useCallback(
    (key: keyof FormState['colori'], value: string) =>
      setConfig((c) => ({ ...c, colori: { ...c.colori, [key]: value } })),
    []
  );

  const setCopertina = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (key: keyof FormState['copertina'], value: any) =>
      setConfig((c) => ({ ...c, copertina: { ...c.copertina, [key]: value } })),
    []
  );

  const setPaginaFinale = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (key: keyof FormState['paginaFinale'], value: any) =>
      setConfig((c) => ({ ...c, paginaFinale: { ...c.paginaFinale, [key]: value } })),
    []
  );

  // ── Image upload handler ───────────────────────────────────────────────────

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Immagine troppo grande (max 2 MB)');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setCopertina('immagineBase64', dataUrl);
    };
    reader.readAsDataURL(file);
  }

  // ── Actions ────────────────────────────────────────────────────────────────

  async function handlePreview() {
    setIsPreviewing(true);
    setPreview(null);
    try {
      // Pass colonne/righe to preview so it can compute the right page count
      const res = await fetch('/api/admin/catalogo-pdf/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore');
      setPreview(data);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Errore anteprima');
    } finally {
      setIsPreviewing(false);
    }
  }

  async function handleGeneraPDF() {
    if (!preview) {
      toast.error("Esegui prima l'anteprima");
      return;
    }
    setIsGenerating(true);
    try {
      const res = await fetch('/api/admin/catalogo-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Errore sconosciuto' }));
        throw new Error(err.error);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const date = new Date().toISOString().slice(0, 10);
      const filter = config.raggruppa || 'completo';
      const a = document.createElement('a');
      a.href = url;
      a.download = `Catalogo-ON-EARTH-${date}-${filter}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('PDF generato con successo');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Errore generazione PDF');
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleSaveTemplate() {
    if (!templateName.trim()) {
      toast.error('Inserisci un nome per il template');
      return;
    }
    setIsSaving(true);
    try {
      // Exclude large image from saved config
      const configToSave = {
        ...config,
        copertina: { ...config.copertina, immagineBase64: null },
      };
      const res = await fetch('/api/admin/catalogo-pdf/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: templateName.trim(), configurazione: configToSave }),
      });
      if (!res.ok) throw new Error('Errore salvataggio');
      toast.success('Configurazione salvata');
      setTemplateName('');
      refetchTemplates();
    } catch {
      toast.error('Errore durante il salvataggio');
    } finally {
      setIsSaving(false);
    }
  }

  function handleLoadTemplate(t: Template) {
    setConfig(t.configurazione);
    setPreview(null);
    toast.success(`Template "${t.nome}" caricato`);
  }

  async function handleDeleteTemplate(id: string, nome: string) {
    if (!confirm(`Eliminare il template "${nome}"?`)) return;
    try {
      const res = await fetch(`/api/admin/catalogo-pdf/templates/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success('Template eliminato');
      refetchTemplates();
    } catch {
      toast.error('Errore eliminazione template');
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Left: form */}
      <div className="flex-1 min-w-0 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <BookOpen size={20} className="text-accent" />
          <div>
            <h1 className="text-lg font-bold text-primary">Generatore Catalogo PDF</h1>
            <p className="text-xs text-gray-500">Configura e scarica il catalogo prodotti in formato PDF</p>
          </div>
        </div>

        {/* ── Filtri ── */}
        <div className="border border-border rounded overflow-hidden">
          <SectionTitle open={sections.filtri} onToggle={() => toggleSection('filtri')}>
            Filtri prodotti
          </SectionTitle>
          {sections.filtri && (
            <div className="p-4 grid grid-cols-2 gap-3">
              <SelectField label="Gruppo merceologico" value={config.gruppoMerceologico}
                onChange={(v) => set('gruppoMerceologico', v)} options={gruppiMerceologici} />
              <SelectField label="Famiglia" value={config.famiglia}
                onChange={(v) => set('famiglia', v)} options={famiglie} />
              <SelectField label="Classe" value={config.classe}
                onChange={(v) => set('classe', v)} options={classi} />
              <SelectField label="Sottoclasse" value={config.sottoclasse}
                onChange={(v) => set('sottoclasse', v)} options={sottoclassi} />
              <SelectField label="Gruppo omogeneo" value={config.gruppoOmogeneo}
                onChange={(v) => set('gruppoOmogeneo', v)} options={gruppiOmogenei} />
              <SelectField label="Linea" value={config.nomLinea}
                onChange={(v) => set('nomLinea', v)} options={linee} />
              <SelectField label="Collezione" value={config.collezione}
                onChange={(v) => set('collezione', v)} options={collezioni} />
              <SelectField label="Colore" value={config.colore}
                onChange={(v) => set('colore', v)} options={colori} />
              <SelectField label="Produttore" value={config.produttore}
                onChange={(v) => set('produttore', v)} options={produttori} />
              <SelectField label="Tranche" value={config.tranche}
                onChange={(v) => set('tranche', v)} options={tranches} />
              <div className="col-span-2 pt-1">
                <CheckboxField
                  label="Solo prodotti attivi"
                  checked={config.soloAttivi}
                  onChange={(v) => set('soloAttivi', v)}
                />
              </div>
            </div>
          )}
        </div>

        {/* ── Formato pagina ── */}
        <div className="border border-border rounded overflow-hidden">
          <SectionTitle open={sections.formato} onToggle={() => toggleSection('formato')}>
            Formato pagina
          </SectionTitle>
          {sections.formato && (
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Formato</label>
                  <select
                    value={config.formato}
                    onChange={(e) => set('formato', e.target.value)}
                    className="w-full h-9 border border-border rounded px-2.5 text-xs bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-primary/30"
                  >
                    <option value="A4-P">A4 Verticale</option>
                    <option value="A4-L">A4 Orizzontale</option>
                    <option value="A3-P">A3 Verticale</option>
                    <option value="A3-L">A3 Orizzontale</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Margini</label>
                  <select
                    value={config.margine}
                    onChange={(e) => set('margine', e.target.value)}
                    className="w-full h-9 border border-border rounded px-2.5 text-xs bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-primary/30"
                  >
                    <option value="stretto">Stretto (10 pt)</option>
                    <option value="normale">Normale (20 pt)</option>
                    <option value="ampio">Ampio (30 pt)</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 items-end">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Colonne</label>
                  <input
                    type="number"
                    min={1}
                    max={6}
                    value={config.colonne}
                    onChange={(e) => set('colonne', Math.max(1, Math.min(6, parseInt(e.target.value) || 1)))}
                    className="w-full h-9 border border-border rounded px-2.5 text-xs bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Righe</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={config.righe}
                    onChange={(e) => set('righe', Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
                    className="w-full h-9 border border-border rounded px-2.5 text-xs bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-primary/30"
                  />
                </div>
                <div className="pb-0.5">
                  <p className="text-xs text-gray-500 font-medium">
                    = <span className="text-primary font-bold">{config.colonne * config.righe}</span> prodotti/pagina
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Stile e colori ── */}
        <div className="border border-border rounded overflow-hidden">
          <SectionTitle open={sections.colori} onToggle={() => toggleSection('colori')}>
            Stile e colori
          </SectionTitle>
          {sections.colori && (
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-5">
              <ColorSwatchPicker
                label="Sfondo pagina"
                value={config.colori.sfondoPagina}
                onChange={(v) => setColore('sfondoPagina', v)}
              />
              <ColorSwatchPicker
                label="Sfondo foto"
                value={config.colori.sfondoFoto}
                onChange={(v) => setColore('sfondoFoto', v)}
              />
              <ColorSwatchPicker
                label="Testo primario"
                value={config.colori.testoPrimario}
                onChange={(v) => setColore('testoPrimario', v)}
              />
              <ColorSwatchPicker
                label="Testo secondario"
                value={config.colori.testoSecondario}
                onChange={(v) => setColore('testoSecondario', v)}
              />
            </div>
          )}
        </div>

        {/* ── Raggruppamento e ordinamento ── */}
        <div className="border border-border rounded overflow-hidden">
          <SectionTitle open={sections.raggruppamento} onToggle={() => toggleSection('raggruppamento')}>
            Raggruppamento e ordinamento
          </SectionTitle>
          {sections.raggruppamento && (
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Raggruppa per</label>
                  <select
                    value={config.raggruppa}
                    onChange={(e) => set('raggruppa', e.target.value)}
                    className="w-full h-9 border border-border rounded px-2.5 text-xs bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-primary/30"
                  >
                    <option value="">Nessun raggruppamento</option>
                    <option value="nomLinea">Linea</option>
                    <option value="classe">Classe</option>
                    <option value="sottoclasse">Sottoclasse</option>
                    <option value="famiglia">Famiglia</option>
                    <option value="gruppoOmogeneo">Gruppo omogeneo</option>
                    <option value="collezione">Collezione</option>
                    <option value="produttore">Produttore</option>
                    <option value="paese">Paese</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Ordina per</label>
                  <select
                    value={config.ordina}
                    onChange={(e) => set('ordina', e.target.value)}
                    className="w-full h-9 border border-border rounded px-2.5 text-xs bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-primary/30"
                  >
                    <option value="code">Codice A→Z</option>
                    <option value="name">Descrizione A→Z</option>
                    <option value="costPrice_asc">Prezzo crescente</option>
                    <option value="costPrice_desc">Prezzo decrescente</option>
                    <option value="nomLinea">Linea</option>
                    <option value="collezione">Collezione</option>
                  </select>
                </div>
              </div>

              {/* Separator mode — shown only when grouping is active */}
              {config.raggruppa && (
                <div>
                  <p className="text-xs font-medium text-gray-600 mb-2">Modalità raggruppamento</p>
                  <div className="space-y-2">
                    {(
                      [
                        { value: 'pagina-intera', label: 'Pagina intera per sezione', desc: 'Ogni gruppo ha una pagina separatore dedicata' },
                        { value: 'inline', label: 'Intestazione inline', desc: 'Intestazione compatta, tutti i gruppi sulla stessa pagina' },
                        { value: 'nuova-riga', label: 'Vai a capo, stessa pagina', desc: 'Intestazione prominente con linea, tutti sulla stessa pagina' },
                      ] as const
                    ).map((opt) => (
                      <label
                        key={opt.value}
                        className="flex items-start gap-2 cursor-pointer group"
                      >
                        <input
                          type="radio"
                          name="modalitaSeparatore"
                          value={opt.value}
                          checked={config.modalitaSeparatore === opt.value}
                          onChange={() => set('modalitaSeparatore', opt.value)}
                          className="mt-0.5 accent-primary"
                        />
                        <div>
                          <span className="text-xs font-medium text-gray-700 group-hover:text-primary transition-colors">
                            {opt.label}
                          </span>
                          <p className="text-2xs text-gray-400">{opt.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Informazioni da mostrare ── */}
        <div className="border border-border rounded overflow-hidden">
          <SectionTitle open={sections.campi} onToggle={() => toggleSection('campi')}>
            Informazioni da mostrare
          </SectionTitle>
          {sections.campi && (
            <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
              <CheckboxField label="Foto prodotto" checked={config.campi.foto} onChange={(v) => setField('foto', v)} />
              <CheckboxField label="Codice" checked={config.campi.codice} onChange={(v) => setField('codice', v)} />
              <CheckboxField label="Descrizione" checked={config.campi.descrizione} onChange={(v) => setField('descrizione', v)} />
              <CheckboxField label="Misure" checked={config.campi.misure} onChange={(v) => setField('misure', v)} />
              <CheckboxField label="Produttore" checked={config.campi.produttore} onChange={(v) => setField('produttore', v)} />
              <CheckboxField label="Paese" checked={config.campi.paese} onChange={(v) => setField('paese', v)} />
              <CheckboxField label="Prezzo costo i.e." checked={config.campi.prezzoCosto} onChange={(v) => setField('prezzoCosto', v)} />
              <CheckboxField label="PVP i.i." checked={config.campi.pvp} onChange={(v) => setField('pvp', v)} />
              <CheckboxField label="Linea" checked={config.campi.linea} onChange={(v) => setField('linea', v)} />
              <CheckboxField label="Collezione" checked={config.campi.collezione} onChange={(v) => setField('collezione', v)} />
              <CheckboxField label="Confezione" checked={config.campi.confezione} onChange={(v) => setField('confezione', v)} />
              <CheckboxField label="IVA" checked={config.campi.iva} onChange={(v) => setField('iva', v)} />
            </div>
          )}
        </div>

        {/* ── Intestazione ── */}
        <div className="border border-border rounded overflow-hidden">
          <SectionTitle open={sections.intestazione} onToggle={() => toggleSection('intestazione')}>
            Intestazione catalogo
          </SectionTitle>
          {sections.intestazione && (
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Titolo catalogo</label>
                <input
                  type="text"
                  value={config.titolo}
                  onChange={(e) => set('titolo', e.target.value)}
                  className="w-full h-9 border border-border rounded px-3 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-primary/30"
                  placeholder="es. Collezione CASA 2027"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <CheckboxField label="Mostra logo ON EARTH" checked={config.mostraLogo} onChange={(v) => set('mostraLogo', v)} />
                <CheckboxField label="Mostra data generazione" checked={config.mostraData} onChange={(v) => set('mostraData', v)} />
                <CheckboxField label="Numero di pagina" checked={config.mostraPagina} onChange={(v) => set('mostraPagina', v)} />
              </div>
            </div>
          )}
        </div>

        {/* ── Copertina ── */}
        <div className="border border-border rounded overflow-hidden">
          <SectionTitle open={sections.copertina} onToggle={() => toggleSection('copertina')}>
            Copertina
          </SectionTitle>
          {sections.copertina && (
            <div className="p-4 space-y-4">
              <CheckboxField
                label="Includi copertina"
                checked={config.copertina.attiva}
                onChange={(v) => setCopertina('attiva', v)}
              />
              {config.copertina.attiva && (
                <div className="space-y-3 pl-2 border-l-2 border-border">
                  {/* Image upload */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Immagine di copertina (max 2 MB)
                    </label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="w-full text-xs text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                    />
                    {config.copertina.immagineBase64 && (
                      <div className="mt-2 flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={config.copertina.immagineBase64}
                          alt="Anteprima copertina"
                          className="h-16 w-24 object-cover rounded border border-border"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setCopertina('immagineBase64', null);
                            if (fileInputRef.current) fileInputRef.current.value = '';
                          }}
                          className="text-2xs text-red-500 hover:text-red-700 underline"
                        >
                          Rimuovi immagine
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Titolo */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Titolo copertina</label>
                    <input
                      type="text"
                      value={config.copertina.titolo}
                      onChange={(e) => setCopertina('titolo', e.target.value)}
                      className="w-full h-9 border border-border rounded px-3 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-primary/30"
                      placeholder="es. Collezione CASA 2027"
                    />
                  </div>

                  {/* Sottotitolo */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Sottotitolo <span className="text-gray-400 font-normal">(opzionale)</span>
                    </label>
                    <input
                      type="text"
                      value={config.copertina.sottotitolo}
                      onChange={(e) => setCopertina('sottotitolo', e.target.value)}
                      className="w-full h-9 border border-border rounded px-3 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-primary/30"
                      placeholder="es. Primavera / Estate 2027"
                    />
                  </div>

                  {/* Layout */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Layout copertina</label>
                    <select
                      value={config.copertina.layout}
                      onChange={(e) => setCopertina('layout', e.target.value)}
                      className="w-full h-9 border border-border rounded px-2.5 text-xs bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-primary/30"
                    >
                      <option value="full-overlay">Immagine piena con testo sovrapposto</option>
                      <option value="half">Metà immagine, metà testo</option>
                      <option value="solo-testo">Solo testo (nessuna immagine)</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Pagina finale ── */}
        <div className="border border-border rounded overflow-hidden">
          <SectionTitle open={sections.paginaFinale} onToggle={() => toggleSection('paginaFinale')}>
            Pagina finale
          </SectionTitle>
          {sections.paginaFinale && (
            <div className="p-4 space-y-4">
              <CheckboxField
                label="Includi pagina finale"
                checked={config.paginaFinale.attiva}
                onChange={(v) => setPaginaFinale('attiva', v)}
              />
              {config.paginaFinale.attiva && (
                <div className="space-y-3 pl-2 border-l-2 border-border">
                  {/* Titolo */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Titolo pagina <span className="text-gray-400 font-normal">(opzionale)</span>
                    </label>
                    <input
                      type="text"
                      value={config.paginaFinale.titolo}
                      onChange={(e) => setPaginaFinale('titolo', e.target.value)}
                      className="w-full h-9 border border-border rounded px-3 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-primary/30"
                      placeholder="es. Grazie per la tua scelta"
                    />
                  </div>

                  {/* Testo libero */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Testo libero{' '}
                      <span className="text-gray-400 font-normal">
                        ({config.paginaFinale.testo.length}/1000)
                      </span>
                    </label>
                    <textarea
                      value={config.paginaFinale.testo}
                      onChange={(e) => setPaginaFinale('testo', e.target.value.slice(0, 1000))}
                      rows={4}
                      className="w-full border border-border rounded px-3 py-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-primary/30 resize-none"
                      placeholder="Testo da mostrare nella pagina finale del catalogo…"
                    />
                  </div>

                  {/* Logo */}
                  <CheckboxField
                    label="Logo ON EARTH in fondo"
                    checked={config.paginaFinale.mostraLogo}
                    onChange={(v) => setPaginaFinale('mostraLogo', v)}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Salva configurazione ── */}
        <div className="border border-border rounded p-4 space-y-3">
          <p className="text-xs font-semibold tracking-widest uppercase text-gray-500">Salva configurazione</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="Nome template (es. Catalogo Linea Braided)"
              className="flex-1 h-9 border border-border rounded px-3 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-primary/30"
              onKeyDown={(e) => e.key === 'Enter' && handleSaveTemplate()}
            />
            <button
              type="button"
              onClick={handleSaveTemplate}
              disabled={isSaving || !templateName.trim()}
              className="flex items-center gap-1.5 px-3 h-9 rounded text-xs font-medium bg-primary text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
              Salva
            </button>
          </div>
        </div>
      </div>

      {/* Right: actions + templates */}
      <div className="w-full lg:w-80 flex-shrink-0 space-y-4">
        {/* Action box */}
        <div className="border border-border rounded p-5 space-y-3 bg-gray-50/50 sticky top-4">
          <p className="text-xs font-semibold tracking-widest uppercase text-gray-500">Generazione</p>

          {/* Preview */}
          <button
            type="button"
            onClick={handlePreview}
            disabled={isPreviewing}
            className="flex items-center justify-center gap-2 w-full h-10 rounded border border-border bg-white text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {isPreviewing ? (
              <><Loader2 size={13} className="animate-spin" /> Calcolo in corso…</>
            ) : (
              <><Eye size={13} /> Anteprima</>
            )}
          </button>

          {/* Preview result */}
          {preview && (
            <div className="bg-white border border-border rounded px-4 py-3 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Prodotti trovati</span>
                <span className="font-semibold text-primary">{preview.count}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Pagine prodotti</span>
                <span className="font-semibold text-primary">~{preview.productPages}</span>
              </div>
              {preview.groupPages > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Pagine separatore</span>
                  <span className="font-semibold text-primary">{preview.groupPages}</span>
                </div>
              )}
              <div className="flex justify-between text-xs border-t border-border pt-1 mt-1">
                <span className="text-gray-500 font-medium">Totale pagine stimate</span>
                <span className="font-bold text-primary">{preview.pages}</span>
              </div>
              {preview.count === 0 && (
                <p className="text-xs text-amber-600 mt-1">
                  Nessun prodotto corrisponde ai filtri selezionati
                </p>
              )}
            </div>
          )}

          {/* Generate PDF */}
          <button
            type="button"
            onClick={handleGeneraPDF}
            disabled={isGenerating || !preview || preview.count === 0}
            className="flex items-center justify-center gap-2 w-full h-10 rounded bg-primary text-white text-xs font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isGenerating ? (
              <><Loader2 size={13} className="animate-spin" /> Generazione in corso…</>
            ) : (
              <><Download size={13} /> Genera PDF</>
            )}
          </button>

          {isGenerating && (
            <p className="text-2xs text-gray-400 text-center">
              Elaborazione immagini in corso, potrebbe richiedere alcuni minuti…
            </p>
          )}

          {!preview && (
            <p className="text-2xs text-gray-400 text-center">
              Esegui prima l&apos;anteprima per stimare il numero di pagine
            </p>
          )}
        </div>

        {/* Templates */}
        <div className="border border-border rounded overflow-hidden">
          <button
            type="button"
            onClick={() => setShowTemplates((s) => !s)}
            className="flex items-center justify-between w-full px-4 py-3 bg-gray-50 text-xs font-semibold tracking-widest uppercase text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <span className="flex items-center gap-2">
              <FolderOpen size={13} />
              Configurazioni salvate
              {templates.length > 0 && (
                <span className="bg-primary text-white text-2xs px-1.5 py-0.5 rounded-full">
                  {templates.length}
                </span>
              )}
            </span>
            {showTemplates ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {showTemplates && (
            <div className="divide-y divide-border">
              {templates.length === 0 ? (
                <p className="px-4 py-5 text-xs text-gray-400 text-center">
                  Nessuna configurazione salvata
                </p>
              ) : (
                templates.map((t) => (
                  <div key={t.id} className="px-4 py-3 flex items-center gap-2 hover:bg-gray-50/50">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-primary truncate">{t.nome}</p>
                      <p className="text-2xs text-gray-400">
                        {new Date(t.createdAt).toLocaleDateString('it-IT')}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleLoadTemplate(t)}
                      title="Carica configurazione"
                      className="flex items-center gap-1 px-2 py-1 text-2xs font-medium border border-border rounded hover:bg-white hover:text-primary transition-colors text-gray-600"
                    >
                      <FolderOpen size={11} />
                      Carica
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteTemplate(t.id, t.nome)}
                      title="Elimina configurazione"
                      className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Layout info */}
        <div className="border border-border rounded p-4 bg-blue-50/50">
          <p className="text-2xs font-semibold uppercase tracking-widest text-blue-500 mb-2">Formato PDF</p>
          <ul className="space-y-1 text-2xs text-gray-500">
            <li>• {config.formato === 'A4-P' ? 'A4 verticale (595 × 842 pt)' :
                   config.formato === 'A4-L' ? 'A4 orizzontale (842 × 595 pt)' :
                   config.formato === 'A3-P' ? 'A3 verticale (842 × 1191 pt)' :
                   'A3 orizzontale (1191 × 842 pt)'}</li>
            <li>• {config.colonne} colonne × {config.righe} righe = <strong>{config.colonne * config.righe}</strong> prodotti/pagina</li>
            <li>• Margini {config.margine === 'stretto' ? '10' : config.margine === 'normale' ? '20' : '30'} pt</li>
            <li>• Header con logo, titolo, data</li>
            <li>• Footer con numero pagina</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
