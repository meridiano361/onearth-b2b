'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { GripVertical, ImageIcon } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { parseSettingsFromDb, DEFAULT_APP_SETTINGS } from '@/contexts/SettingsContext';
import type { AppSettingsData } from '@/contexts/SettingsContext';
import { SOCIAL_KEYS, DEFAULT_SOCIAL_URLS } from '@/lib/settingsHelpers';

// ─── Types ────────────────────────────────────────────────────────────────────

type SettingsFlat = Record<string, string>;

function settingsToFlat(s: AppSettingsData): SettingsFlat {
  const f: SettingsFlat = {};
  // home
  f['home.titolo1'] = s.home.titolo1;
  f['home.titolo1.maiuscolo'] = String(s.home.titolo1Maiuscolo);
  f['home.titolo1.colore'] = s.home.titolo1Colore;
  f['home.titolo1.size'] = String(s.home.titolo1Size);
  f['home.titolo1.font'] = s.home.titolo1Font;
  f['home.titolo1.weight'] = s.home.titolo1Weight;
  f['home.titolo1.lineHeight'] = String(s.home.titolo1LineHeight);
  f['home.titolo1.letterSpacing'] = String(s.home.titolo1LetterSpacing);
  f['home.titolo1.transform'] = s.home.titolo1Transform;
  f['home.titolo2'] = s.home.titolo2;
  f['home.titolo2.colore'] = s.home.titolo2Colore;
  f['home.titolo2.size'] = String(s.home.titolo2Size);
  f['home.titolo2.font'] = s.home.titolo2Font;
  f['home.titolo2.weight'] = s.home.titolo2Weight;
  f['home.titolo2.lineHeight'] = String(s.home.titolo2LineHeight);
  f['home.titolo2.letterSpacing'] = String(s.home.titolo2LetterSpacing);
  f['home.titolo2.transform'] = s.home.titolo2Transform;
  f['home.cta'] = s.home.cta;
  f['home.scrollAttivo'] = String(s.home.scrollAttivo);
  f['home.scrollNumero'] = String(s.home.scrollNumero);
  f['home.scrollCollezione'] = s.home.scrollCollezione;
  f['home.editorialAttivo'] = String(s.home.editorialAttivo);
  f['home.editorialUrl'] = s.home.editorialUrl;
  f['home.editorialCaption'] = s.home.editorialCaption;
  // login
  f['login.sfondoUrl'] = s.login.sfondoUrl;
  f['login.caption'] = s.login.caption;
  // social
  f['social.ordine'] = JSON.stringify(s.social.ordine);
  for (const [k, v] of Object.entries(s.social.items)) {
    f[`social.${k}.visibile`] = String(v.visibile);
    f[`social.${k}.url`] = v.url;
  }
  // menu
  f['menu.ordine'] = JSON.stringify(s.menu.ordine);
  for (const [k, v] of Object.entries(s.menu.items)) {
    f[`menu.${k}.label`] = v.label;
    f[`menu.${k}.visibile`] = String(v.visibile);
  }
  // scheda
  for (const [k, v] of Object.entries(s.scheda)) {
    f[`scheda.${k}`] = String(v);
  }
  // card
  for (const [k, v] of Object.entries(s.card)) {
    f[`card.${k}`] = String(v);
  }
  // colori
  f['colori.sfondo'] = s.colori.sfondo;
  f['colori.pulsanti'] = s.colori.pulsanti;
  f['colori.testoPulsanti'] = s.colori.testoPulsanti;
  f['colori.testo'] = s.colori.testo;
  // ordine
  for (const [k, v] of Object.entries(s.ordine)) {
    f[`ordine.${k}`] = String(v);
  }
  // comunicazione
  f['comunicazione.attivo']         = String(s.comunicazione.attivo);
  f['comunicazione.titolo']         = s.comunicazione.titolo;
  f['comunicazione.testo']          = s.comunicazione.testo;
  f['comunicazione.colore']         = s.comunicazione.colore;
  f['comunicazione.posizione']      = s.comunicazione.posizione;
  f['comunicazione.font']           = s.comunicazione.font;
  f['comunicazione.fontSizeTitolo'] = String(s.comunicazione.fontSizeTitolo);
  f['comunicazione.fontSizeTesto']  = String(s.comunicazione.fontSizeTesto);
  f['comunicazione.pesoTitolo']     = s.comunicazione.pesoTitolo;
  f['comunicazione.pesoTesto']      = s.comunicazione.pesoTesto;
  f['comunicazione.allineamento']   = s.comunicazione.allineamento;
  f['comunicazione.trasformazione'] = s.comunicazione.trasformazione;
  f['comunicazione.corsivoTitolo']  = String(s.comunicazione.corsivoTitolo);
  f['comunicazione.corsivoTesto']   = String(s.comunicazione.corsivoTesto);
  f['comunicazione.sfondo']         = s.comunicazione.sfondo;
  f['comunicazione.coloreTesto']    = s.comunicazione.coloreTesto;
  f['comunicazione.coloreTitolo']   = s.comunicazione.coloreTitolo;
  f['comunicazione.bordo']          = s.comunicazione.bordo;
  f['comunicazione.coloreBordo']    = s.comunicazione.coloreBordo;
  f['comunicazione.raggio']         = String(s.comunicazione.raggio);
  f['comunicazione.ombra']          = s.comunicazione.ombra;
  f['comunicazione.padding']        = String(s.comunicazione.padding);
  f['comunicazione.larghezza']      = s.comunicazione.larghezza;
  f['comunicazione.mostraIcona']    = String(s.comunicazione.mostraIcona);
  f['comunicazione.icona']          = s.comunicazione.icona;
  f['comunicazione.posizioneIcona'] = s.comunicazione.posizioneIcona;
  f['comunicazione.chiudibile']     = String(s.comunicazione.chiudibile);
  f['comunicazione.soloUnaVolta']   = String(s.comunicazione.soloUnaVolta);
  f['comunicazione.scadenza']       = s.comunicazione.scadenza;
  return f;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-border rounded-xl p-5 space-y-4">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500">{title}</h2>
      {children}
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between cursor-pointer select-none">
      <span className="text-sm text-gray-700">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-5 rounded-full transition-colors ${checked ? 'bg-gray-900' : 'bg-gray-300'}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : ''}`}
        />
      </button>
    </label>
  );
}

function SaveButton({ onClick, loading }: { onClick: () => void; loading: boolean }) {
  return (
    <div className="flex justify-end pt-2">
      <button
        onClick={onClick}
        disabled={loading}
        className="px-4 py-2 bg-gray-900 text-white text-xs font-medium rounded hover:bg-gray-700 disabled:opacity-50 transition-colors"
      >
        {loading ? 'Salvataggio…' : 'Salva'}
      </button>
    </div>
  );
}

function ColorPickerWithPalette({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const palette = ['#FFFFFF','#F5F0EA','#FFFBEB','#F3F4F6','#111827','#374151','#6B7280',
                   '#C17A5A','#B45309','#DC2626','#2563EB','#059669','#7C3AED'];
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {palette.map(c => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            title={c}
            className="w-6 h-6 rounded border border-border transition-transform hover:scale-110"
            style={{ backgroundColor: c, outline: value === c ? '2px solid #111827' : undefined, outlineOffset: '2px' }}
          />
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-8 h-8 rounded border border-border cursor-pointer flex-shrink-0"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 border border-border rounded px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-gray-900 font-mono"
        />
      </div>
    </div>
  );
}

function ComunicazionePreview({ cs }: { cs: AppSettingsData['comunicazione'] }) {
  const fontFamily = cs.font === 'system' ? undefined : cs.font === 'serif' ? 'Georgia, serif' : cs.font === 'mono' ? 'monospace' : undefined;
  const borderWidth = cs.bordo === 'none' ? 0 : cs.bordo === 'thin' ? 1 : cs.bordo === 'medium' ? 2 : 3;
  const boxShadow = cs.ombra === 'sm' ? '0 1px 3px rgba(0,0,0,0.12)' : cs.ombra === 'md' ? '0 4px 12px rgba(0,0,0,0.15)' : cs.ombra === 'lg' ? '0 8px 24px rgba(0,0,0,0.18)' : undefined;
  const maxWidth = cs.larghezza === 'sm' ? '320px' : cs.larghezza === 'md' ? '480px' : cs.larghezza === 'lg' ? '640px' : '100%';
  const textAlign = cs.allineamento as React.CSSProperties['textAlign'];

  const titleEl = (cs.titolo || 'Titolo del messaggio') ? (
    <p style={{
      fontSize: cs.fontSizeTitolo,
      fontWeight: cs.pesoTitolo,
      fontStyle: cs.corsivoTitolo ? 'italic' : undefined,
      textTransform: cs.trasformazione as React.CSSProperties['textTransform'],
      color: cs.coloreTitolo,
      margin: 0,
      fontFamily,
    }}>
      {cs.titolo || 'Titolo del messaggio'}
    </p>
  ) : null;

  const textEl = (cs.testo || 'Testo del messaggio di esempio per la preview.') ? (
    <p style={{
      fontSize: cs.fontSizeTesto,
      fontWeight: cs.pesoTesto,
      fontStyle: cs.corsivoTesto ? 'italic' : undefined,
      color: cs.coloreTesto,
      margin: 0,
      fontFamily,
    }}>
      {cs.testo || 'Testo del messaggio di esempio per la preview.'}
    </p>
  ) : null;

  const icon = cs.mostraIcona && cs.icona ? (
    <span style={{ fontSize: cs.fontSizeTitolo + 2 }}>{cs.icona}</span>
  ) : null;

  return (
    <div style={{ maxWidth }}>
      <div style={{
        backgroundColor: cs.sfondo,
        borderRadius: cs.raggio,
        borderWidth,
        borderStyle: borderWidth > 0 ? 'solid' : undefined,
        borderColor: cs.coloreBordo,
        padding: cs.padding,
        boxShadow,
        textAlign,
      }}>
        {cs.posizioneIcona === 'before' ? (
          <div style={{ display: 'flex', flexDirection: cs.allineamento === 'center' ? 'column' : 'row', alignItems: cs.allineamento === 'center' ? 'center' : 'flex-start', gap: 8 }}>
            {icon}
            <div style={{ flex: 1 }}>
              {titleEl}
              {titleEl && textEl && <div style={{ height: 4 }} />}
              {textEl}
            </div>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', justifyContent: cs.allineamento === 'right' ? 'flex-end' : cs.allineamento === 'center' ? 'center' : 'flex-start', gap: 8 }}>
              {titleEl}
              {icon}
            </div>
            {titleEl && textEl && <div style={{ height: 4 }} />}
            {textEl}
          </div>
        )}
        {cs.chiudibile && (
          <div style={{ textAlign: 'right', marginTop: 8 }}>
            <span style={{ fontSize: 11, color: cs.coloreTesto, opacity: 0.5, cursor: 'pointer' }}>✕ chiudi</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── DnD sortable menu item ───────────────────────────────────────────────────

interface MenuItemDef {
  key: string;
  label: string;
  visibile: boolean;
}

function SortableMenuItem({
  item,
  onChange,
}: {
  item: MenuItemDef;
  onChange: (key: string, field: 'label' | 'visibile', value: string | boolean) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.key });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 bg-gray-50 border border-border rounded-lg px-3 py-2.5"
    >
      <button {...attributes} {...listeners} type="button" className="cursor-grab text-gray-400 hover:text-gray-600">
        <GripVertical size={14} />
      </button>
      <input
        type="text"
        value={item.label}
        onChange={(e) => onChange(item.key, 'label', e.target.value)}
        className="flex-1 text-sm bg-white border border-border rounded px-2 py-1 outline-none focus:ring-1 focus:ring-gray-900 text-primary"
      />
      <button
        type="button"
        onClick={() => onChange(item.key, 'visibile', !item.visibile)}
        className={`relative w-9 h-[18px] rounded-full transition-colors flex-shrink-0 ${item.visibile ? 'bg-gray-900' : 'bg-gray-300'}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-transform ${item.visibile ? 'translate-x-[18px]' : ''}`}
        />
      </button>
    </div>
  );
}

// ─── Image upload input ────────────────────────────────────────────────────────

function ImageUploadInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const json = await res.json();
      if (json.url) onChange(json.url);
      else toast.error(json.error ?? 'Upload fallito');
    } catch {
      toast.error("Errore durante l'upload");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <label className="text-xs text-gray-500 mb-1.5 block">{label}</label>
      <div className="flex gap-3 items-start">
        <div className="w-16 h-16 rounded border border-border overflow-hidden flex-shrink-0 bg-gray-50 flex items-center justify-center">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt={label} className="w-full h-full object-cover" />
          ) : (
            <ImageIcon size={20} className="text-gray-300" />
          )}
        </div>
        <div className="flex-1 space-y-1.5">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://..."
            className="w-full border border-border rounded px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-gray-900 text-gray-600"
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="px-3 py-1.5 bg-gray-100 text-xs font-medium rounded hover:bg-gray-200 disabled:opacity-50 transition-colors"
          >
            {uploading ? 'Caricamento…' : 'Carica immagine'}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = '';
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── DnD sortable social item ─────────────────────────────────────────────────

const SOCIAL_LABELS: Record<string, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  pinterest: 'Pinterest',
  tiktok: 'TikTok',
  website: 'Website',
  podcast: 'Podcast',
};

interface SocialItemDef {
  key: string;
  visibile: boolean;
  url: string;
}

function SortableSocialItem({
  item,
  onChange,
}: {
  item: SocialItemDef;
  onChange: (key: string, field: 'visibile' | 'url', value: string | boolean) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.key });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div ref={setNodeRef} style={style} className="bg-gray-50 border border-border rounded-lg px-3 py-2.5 space-y-1.5">
      <div className="flex items-center gap-3">
        <button {...attributes} {...listeners} type="button" className="cursor-grab text-gray-400 hover:text-gray-600">
          <GripVertical size={14} />
        </button>
        <span className="text-sm font-medium text-gray-700 flex-1">{SOCIAL_LABELS[item.key] ?? item.key}</span>
        <button
          type="button"
          onClick={() => onChange(item.key, 'visibile', !item.visibile)}
          className={`relative w-9 h-[18px] rounded-full transition-colors flex-shrink-0 ${item.visibile ? 'bg-gray-900' : 'bg-gray-300'}`}
        >
          <span className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-transform ${item.visibile ? 'translate-x-[18px]' : ''}`} />
        </button>
      </div>
      <input
        type="url"
        value={item.url}
        onChange={(e) => onChange(item.key, 'url', e.target.value)}
        placeholder="https://..."
        className="w-full border border-border rounded px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-gray-900 text-gray-600 ml-5"
      />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const ALL_CATALOG_FILTERS: { key: string; label: string }[] = [
  { key: 'gruppoMerceologico', label: 'Gruppo merceologico' },
  { key: 'famiglia',           label: 'Famiglia' },
  { key: 'classe',             label: 'Classe' },
  { key: 'sottoclasse',        label: 'Sottoclasse' },
  { key: 'gruppoOmogeneo',     label: 'Gruppo omogeneo' },
  { key: 'nomLinea',           label: 'Linea' },
  { key: 'collezione',         label: 'Collezione' },
  { key: 'colore',             label: 'Colore' },
  { key: 'temaColore',         label: 'Tema colore' },
  { key: 'stagione',           label: 'Stagione' },
  { key: 'produttore',         label: 'Produttore' },
  { key: 'tranche',            label: 'Tranche' },
];

export default function AdminPersonalizzazionePage() {
  const [settings, setSettings] = useState<AppSettingsData>(DEFAULT_APP_SETTINGS);
  const [saving, setSaving] = useState<string | null>(null);

  // Filtri catalogo cliente
  const [filtriVisibili, setFiltriVisibili] = useState<string[]>([]);
  const [savingFiltri, setSavingFiltri] = useState(false);

  useEffect(() => {
    fetch('/api/admin/catalog-settings')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d.filtriVisibili)) setFiltriVisibili(d.filtriVisibili); })
      .catch(() => {});
  }, []);

  async function saveFiltriCatalogo() {
    setSavingFiltri(true);
    try {
      const res = await fetch('/api/admin/catalog-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filtriVisibili }),
      });
      if (!res.ok) throw new Error();
      toast.success('Filtri catalogo salvati');
    } catch {
      toast.error('Errore nel salvataggio');
    } finally {
      setSavingFiltri(false);
    }
  }

  function toggleFiltro(key: string) {
    setFiltriVisibili(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const { isLoading } = useQuery({
    queryKey: ['admin-personalizzazione'],
    queryFn: async () => {
      const res = await fetch('/api/settings/public');
      if (!res.ok) return null;
      const flat = await res.json() as Record<string, string>;
      const records = Object.entries(flat).map(([chiave, valore]) => ({ chiave, valore }));
      const parsed = parseSettingsFromDb(records);
      setSettings(parsed);
      return parsed;
    },
    staleTime: 0,
  });

  const update = useCallback(<K extends keyof AppSettingsData>(section: K, patch: Partial<AppSettingsData[K]>) => {
    setSettings((prev) => ({ ...prev, [section]: { ...prev[section], ...patch } }));
  }, []);

  async function saveSection(keys: string[], label: string) {
    setSaving(label);
    const flat = settingsToFlat(settings);
    const body: SettingsFlat = {};
    for (const k of keys) {
      if (flat[k] !== undefined) body[k] = flat[k];
    }
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      toast.success(`${label} salvato`);
    } catch {
      toast.error('Errore nel salvataggio');
    } finally {
      setSaving(null);
    }
  }

  function handleMenuDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = settings.menu.ordine.indexOf(String(active.id));
    const newIndex = settings.menu.ordine.indexOf(String(over.id));
    const newOrdine = arrayMove(settings.menu.ordine, oldIndex, newIndex);
    update('menu', { ordine: newOrdine });
  }

  function handleMenuItemChange(key: string, field: 'label' | 'visibile', value: string | boolean) {
    update('menu', {
      items: {
        ...settings.menu.items,
        [key]: { ...settings.menu.items[key], [field]: value },
      },
    });
  }

  function handleSocialDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = settings.social.ordine.indexOf(String(active.id));
    const newIndex = settings.social.ordine.indexOf(String(over.id));
    update('social', { ordine: arrayMove(settings.social.ordine, oldIndex, newIndex) });
  }

  function handleSocialItemChange(key: string, field: 'visibile' | 'url', value: string | boolean) {
    update('social', {
      items: {
        ...settings.social.items,
        [key]: { ...settings.social.items[key], [field]: value },
      },
    });
  }

  const comunicazioneKeys = [
    'comunicazione.attivo', 'comunicazione.titolo', 'comunicazione.testo', 'comunicazione.colore',
    'comunicazione.posizione', 'comunicazione.font', 'comunicazione.fontSizeTitolo', 'comunicazione.fontSizeTesto',
    'comunicazione.pesoTitolo', 'comunicazione.pesoTesto', 'comunicazione.allineamento', 'comunicazione.trasformazione',
    'comunicazione.corsivoTitolo', 'comunicazione.corsivoTesto',
    'comunicazione.sfondo', 'comunicazione.coloreTesto', 'comunicazione.coloreTitolo',
    'comunicazione.bordo', 'comunicazione.coloreBordo', 'comunicazione.raggio', 'comunicazione.ombra',
    'comunicazione.padding', 'comunicazione.larghezza',
    'comunicazione.mostraIcona', 'comunicazione.icona', 'comunicazione.posizioneIcona',
    'comunicazione.chiudibile', 'comunicazione.soloUnaVolta', 'comunicazione.scadenza',
  ];
  const homeKeys = [
    'home.titolo1', 'home.titolo1.maiuscolo', 'home.titolo1.colore', 'home.titolo1.size',
    'home.titolo1.font', 'home.titolo1.weight', 'home.titolo1.lineHeight', 'home.titolo1.letterSpacing', 'home.titolo1.transform',
    'home.titolo2', 'home.titolo2.colore', 'home.titolo2.size',
    'home.titolo2.font', 'home.titolo2.weight', 'home.titolo2.lineHeight', 'home.titolo2.letterSpacing', 'home.titolo2.transform',
    'home.cta', 'home.scrollAttivo', 'home.scrollNumero', 'home.scrollCollezione',
    'home.editorialAttivo', 'home.editorialUrl', 'home.editorialCaption',
  ];
  const loginKeys = ['login.sfondoUrl', 'login.caption'];
  const menuKeys = ['menu.ordine', ...settings.menu.ordine.flatMap((k) => [`menu.${k}.label`, `menu.${k}.visibile`])];
  const schedaKeys = Object.keys(settings.scheda).map((k) => `scheda.${k}`);
  const cardKeys = Object.keys(settings.card).map((k) => `card.${k}`);
  const ordineKeys = Object.keys(settings.ordine).map((k) => `ordine.${k}`);
  const coloriKeys = ['colori.sfondo', 'colori.pulsanti', 'colori.testoPulsanti', 'colori.testo'];
  const socialKeys = ['social.ordine', ...SOCIAL_KEYS.flatMap((k) => [`social.${k}.visibile`, `social.${k}.url`])];

  if (isLoading) {
    return <div className="p-8 text-sm text-gray-400">Caricamento impostazioni…</div>;
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-lg font-semibold text-primary">Personalizzazione</h1>

      {/* ── Homepage ─────────────────────────────────────── */}
      <SectionCard title="Homepage">
        <div className="space-y-4">

          {/* Titolo 1 */}
          <div className="space-y-2">
            <p className="text-2xs font-semibold uppercase tracking-widest text-gray-400">Titolo 1</p>
            <input
              type="text"
              value={settings.home.titolo1}
              onChange={(e) => update('home', { titolo1: e.target.value })}
              className="w-full border border-border rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-gray-900"
            />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Font</label>
                <select value={settings.home.titolo1Font} onChange={(e) => update('home', { titolo1Font: e.target.value })} className="w-full border border-border rounded px-2 py-1.5 text-xs outline-none bg-white">
                  {[['system','System (Nunito)'],['nova','Nova'],['playfair','Playfair Display'],['montserrat','Montserrat'],['lato','Lato'],['georgia','Georgia'],['futura','Futura']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Peso</label>
                <select value={settings.home.titolo1Weight} onChange={(e) => update('home', { titolo1Weight: e.target.value })} className="w-full border border-border rounded px-2 py-1.5 text-xs outline-none bg-white">
                  {[['light','Light'],['normal','Normal'],['medium','Medium'],['semibold','Semibold'],['bold','Bold'],['extrabold','Extrabold']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Trasformazione</label>
                <select value={settings.home.titolo1Transform} onChange={(e) => update('home', { titolo1Transform: e.target.value })} className="w-full border border-border rounded px-2 py-1.5 text-xs outline-none bg-white">
                  <option value="none">Nessuna</option>
                  <option value="uppercase">MAIUSCOLO</option>
                  <option value="lowercase">minuscolo</option>
                  <option value="capitalize">Prima Lettera</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Colore</label>
                <div className="flex items-center gap-1.5">
                  <input type="color" value={settings.home.titolo1Colore} onChange={(e) => update('home', { titolo1Colore: e.target.value })} className="w-8 h-8 rounded border border-border cursor-pointer flex-shrink-0" />
                  <input type="text" value={settings.home.titolo1Colore} onChange={(e) => update('home', { titolo1Colore: e.target.value })} className="flex-1 border border-border rounded px-2 py-1.5 text-xs outline-none" />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Dimensione (px)</label>
                <input type="range" min={12} max={60} value={settings.home.titolo1Size} onChange={(e) => update('home', { titolo1Size: Number(e.target.value) })} className="w-full" />
                <p className="text-2xs text-gray-400 text-center">{settings.home.titolo1Size}px</p>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Interlinea</label>
                <input type="range" min={1} max={2} step={0.05} value={settings.home.titolo1LineHeight} onChange={(e) => update('home', { titolo1LineHeight: Number(e.target.value) })} className="w-full" />
                <p className="text-2xs text-gray-400 text-center">{settings.home.titolo1LineHeight.toFixed(2)}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Spaziatura (px)</label>
                <input type="range" min={-2} max={10} step={0.5} value={settings.home.titolo1LetterSpacing} onChange={(e) => update('home', { titolo1LetterSpacing: Number(e.target.value) })} className="w-full" />
                <p className="text-2xs text-gray-400 text-center">{settings.home.titolo1LetterSpacing}px</p>
              </div>
            </div>
          </div>

          {/* Titolo 2 */}
          <div className="space-y-2 pt-2 border-t border-border">
            <p className="text-2xs font-semibold uppercase tracking-widest text-gray-400">Titolo 2</p>
            <input
              type="text"
              value={settings.home.titolo2}
              onChange={(e) => update('home', { titolo2: e.target.value })}
              className="w-full border border-border rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-gray-900"
            />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Font</label>
                <select value={settings.home.titolo2Font} onChange={(e) => update('home', { titolo2Font: e.target.value })} className="w-full border border-border rounded px-2 py-1.5 text-xs outline-none bg-white">
                  {[['system','System (Nunito)'],['nova','Nova'],['playfair','Playfair Display'],['montserrat','Montserrat'],['lato','Lato'],['georgia','Georgia'],['futura','Futura']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Peso</label>
                <select value={settings.home.titolo2Weight} onChange={(e) => update('home', { titolo2Weight: e.target.value })} className="w-full border border-border rounded px-2 py-1.5 text-xs outline-none bg-white">
                  {[['light','Light'],['normal','Normal'],['medium','Medium'],['semibold','Semibold'],['bold','Bold'],['extrabold','Extrabold']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Trasformazione</label>
                <select value={settings.home.titolo2Transform} onChange={(e) => update('home', { titolo2Transform: e.target.value })} className="w-full border border-border rounded px-2 py-1.5 text-xs outline-none bg-white">
                  <option value="none">Nessuna</option>
                  <option value="uppercase">MAIUSCOLO</option>
                  <option value="lowercase">minuscolo</option>
                  <option value="capitalize">Prima Lettera</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Colore</label>
                <div className="flex items-center gap-1.5">
                  <input type="color" value={settings.home.titolo2Colore} onChange={(e) => update('home', { titolo2Colore: e.target.value })} className="w-8 h-8 rounded border border-border cursor-pointer flex-shrink-0" />
                  <input type="text" value={settings.home.titolo2Colore} onChange={(e) => update('home', { titolo2Colore: e.target.value })} className="flex-1 border border-border rounded px-2 py-1.5 text-xs outline-none" />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Dimensione (px)</label>
                <input type="range" min={12} max={40} value={settings.home.titolo2Size} onChange={(e) => update('home', { titolo2Size: Number(e.target.value) })} className="w-full" />
                <p className="text-2xs text-gray-400 text-center">{settings.home.titolo2Size}px</p>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Interlinea</label>
                <input type="range" min={1} max={2} step={0.05} value={settings.home.titolo2LineHeight} onChange={(e) => update('home', { titolo2LineHeight: Number(e.target.value) })} className="w-full" />
                <p className="text-2xs text-gray-400 text-center">{settings.home.titolo2LineHeight.toFixed(2)}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Spaziatura (px)</label>
                <input type="range" min={-2} max={10} step={0.5} value={settings.home.titolo2LetterSpacing} onChange={(e) => update('home', { titolo2LetterSpacing: Number(e.target.value) })} className="w-full" />
                <p className="text-2xs text-gray-400 text-center">{settings.home.titolo2LetterSpacing}px</p>
              </div>
            </div>
          </div>

          {/* CTA + scroll */}
          <div className="space-y-3 pt-2 border-t border-border">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Testo CTA</label>
              <input type="text" value={settings.home.cta} onChange={(e) => update('home', { cta: e.target.value })} className="w-full border border-border rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-gray-900" />
            </div>
            <ToggleRow label="Mostra scroll prodotti" checked={settings.home.scrollAttivo} onChange={(v) => update('home', { scrollAttivo: v })} />
            {settings.home.scrollAttivo && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Numero prodotti (3–20)</label>
                  <input type="number" value={settings.home.scrollNumero} onChange={(e) => update('home', { scrollNumero: Number(e.target.value) })} className="w-full border border-border rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-gray-900" min={3} max={20} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Filtra per collezione</label>
                  <input type="text" value={settings.home.scrollCollezione} onChange={(e) => update('home', { scrollCollezione: e.target.value })} placeholder="es. CA27 (vuoto = tutti)" className="w-full border border-border rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-gray-900" />
                </div>
              </div>
            )}
          </div>

          {/* Foto editoriale */}
          <div className="space-y-3 pt-2 border-t border-border">
            <ToggleRow label="Mostra foto editoriale" checked={settings.home.editorialAttivo} onChange={(v) => update('home', { editorialAttivo: v })} />
            {settings.home.editorialAttivo && (
              <>
                <ImageUploadInput
                  label="Foto editoriale"
                  value={settings.home.editorialUrl}
                  onChange={(url) => update('home', { editorialUrl: url })}
                />
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Didascalia (opzionale)</label>
                  <input
                    type="text"
                    value={settings.home.editorialCaption}
                    onChange={(e) => update('home', { editorialCaption: e.target.value })}
                    placeholder="Es. Collezione CASA 2027"
                    className="w-full border border-border rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-gray-900"
                  />
                </div>
              </>
            )}
          </div>
        </div>
        <SaveButton onClick={() => saveSection(homeKeys, 'Homepage')} loading={saving === 'Homepage'} />
      </SectionCard>

      {/* ── 3b: Menu navigazione ─────────────────────────────── */}
      <SectionCard title="Menu navigazione">
        <p className="text-xs text-gray-400">Trascina per riordinare · modifica il nome direttamente nel campo · usa il toggle per mostrare/nascondere.</p>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleMenuDragEnd}>
          <SortableContext items={settings.menu.ordine} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {settings.menu.ordine.map((key) => (
                <SortableMenuItem
                  key={key}
                  item={{ key, ...settings.menu.items[key] }}
                  onChange={handleMenuItemChange}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
        <SaveButton onClick={() => saveSection(menuKeys, 'Menu')} loading={saving === 'Menu'} />
      </SectionCard>

      {/* ── 3c: Scheda prodotto ───────────────────────────────── */}
      <SectionCard title="Scheda prodotto">
        <div className="space-y-2">
          {(
            [
              ['codice', 'Codice prodotto'],
              ['descrizione', 'Descrizione'],
              ['produttore', 'Produttore'],
              ['paese', 'Paese'],
              ['misure', 'Misure'],
              ['linea', 'Linea'],
              ['collezione', 'Collezione'],
              ['colore', 'Colore'],
              ['temaColore', 'Tema colore'],
              ['confezione', 'Confezione (lotto)'],
              ['iva', 'IVA'],
              ['prezzoCosto', 'Prezzo costo'],
              ['pvp', 'Prezzo vendita (PVP)'],
              ['fasciaSconto', 'Fascia sconto'],
              ['fasciaRicarico', 'Fascia ricarico'],
              ['margine', 'Margine %'],
              ['guadagnoPotenziale', 'Guadagno potenziale'],
              ['note', 'Note'],
            ] as [keyof AppSettingsData['scheda'], string][]
          ).map(([k, label]) => (
            <ToggleRow
              key={k}
              label={label}
              checked={settings.scheda[k]}
              onChange={(v) => update('scheda', { [k]: v } as Partial<AppSettingsData['scheda']>)}
            />
          ))}
        </div>
        <SaveButton onClick={() => saveSection(schedaKeys, 'Scheda')} loading={saving === 'Scheda'} />
      </SectionCard>

      {/* ── 3d: Card catalogo ─────────────────────────────────── */}
      <SectionCard title="Card catalogo">
        <div className="space-y-2">
          {(
            [
              ['codice', 'Codice prodotto'],
              ['prezzoCosto', 'Prezzo costo'],
              ['pvp', 'Prezzo vendita (PVP)'],
              ['aggiungi', 'Pulsante Aggiungi'],
              ['badgeNuovo', 'Badge NUOVO'],
              ['cuoricino', 'Icona preferiti (cuoricino)'],
            ] as [keyof AppSettingsData['card'], string][]
          ).map(([k, label]) => (
            <ToggleRow
              key={k}
              label={label}
              checked={settings.card[k]}
              onChange={(v) => update('card', { [k]: v } as Partial<AppSettingsData['card']>)}
            />
          ))}
        </div>
        <SaveButton onClick={() => saveSection(cardKeys, 'Card')} loading={saving === 'Card'} />
      </SectionCard>

      {/* ── 3e: Dati finanziari ordine ──────────────────────── */}
      <SectionCard title="Dati finanziari ordine">
        <p className="text-xs text-gray-400">Scegli quali campi finanziari mostrare al cliente nella barra ordine e nella pagina ordini.</p>
        <div className="space-y-2">
          {(
            [
              ['mostraBudget',    'Budget destinazione'],
              ['mostraCosto',     'Costo ordine (prezzo costo i.e. totale)'],
              ['mostraVendite',   'Vendite potenziali (PVP totale i.i.)'],
              ['mostraGuadagno',  'Guadagno potenziale'],
              ['mostraMargine',   'Margine medio %'],
              ['mostraRimanente', 'Rimangono (budget residuo)'],
            ] as [keyof AppSettingsData['ordine'], string][]
          ).map(([k, label]) => (
            <ToggleRow
              key={k}
              label={label}
              checked={settings.ordine[k]}
              onChange={(v) => update('ordine', { [k]: v } as Partial<AppSettingsData['ordine']>)}
            />
          ))}
        </div>
        <SaveButton onClick={() => saveSection(ordineKeys, 'Ordine')} loading={saving === 'Ordine'} />
      </SectionCard>

      {/* ── 3f: Colori tema ───────────────────────────────────── */}
      <SectionCard title="Colori tema">
        <div className="space-y-3">
          {(
            [
              ['sfondo', 'Sfondo'],
              ['pulsanti', 'Pulsanti'],
              ['testoPulsanti', 'Testo pulsanti'],
              ['testo', 'Testo principale'],
            ] as [keyof AppSettingsData['colori'], string][]
          ).map(([k, label]) => (
            <div key={k} className="flex items-center gap-3">
              <input
                type="color"
                value={settings.colori[k]}
                onChange={(e) => update('colori', { [k]: e.target.value } as Partial<AppSettingsData['colori']>)}
                className="w-9 h-9 rounded border border-border cursor-pointer flex-shrink-0"
              />
              <span className="text-sm text-gray-700 w-36 flex-shrink-0">{label}</span>
              <input
                type="text"
                value={settings.colori[k]}
                onChange={(e) => update('colori', { [k]: e.target.value } as Partial<AppSettingsData['colori']>)}
                className="flex-1 border border-border rounded px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-gray-900"
              />
            </div>
          ))}
        </div>
        <SaveButton onClick={() => saveSection(coloriKeys, 'Colori')} loading={saving === 'Colori'} />
      </SectionCard>

      {/* ── Social media ─────────────────────────────────────── */}
      <SectionCard title="Social media">
        <p className="text-xs text-gray-400">Trascina per riordinare · usa il toggle per mostrare/nascondere · modifica il link per personalizzare l'URL.</p>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSocialDragEnd}>
          <SortableContext items={settings.social.ordine} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {settings.social.ordine.map((key) => (
                <SortableSocialItem
                  key={key}
                  item={{ key, ...settings.social.items[key] }}
                  onChange={handleSocialItemChange}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
        <SaveButton onClick={() => saveSection(socialKeys, 'Social')} loading={saving === 'Social'} />
      </SectionCard>

      {/* ── Pagina di accesso ─────────────────────────────────── */}
      <SectionCard title="Pagina di accesso">
        <p className="text-xs text-gray-400">Personalizza il pannello visivo della pagina di login (visibile solo su desktop, lato sinistro).</p>
        <ImageUploadInput
          label="Immagine di sfondo"
          value={settings.login.sfondoUrl}
          onChange={(url) => update('login', { sfondoUrl: url })}
        />
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Didascalia</label>
          <input
            type="text"
            value={settings.login.caption}
            onChange={(e) => update('login', { caption: e.target.value })}
            placeholder="Es. Collezione CASA 2027"
            className="w-full border border-border rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-gray-900"
          />
        </div>
        <SaveButton onClick={() => saveSection(loginKeys, 'Login')} loading={saving === 'Login'} />
      </SectionCard>

      {/* ── Messaggi ai clienti ──────────────────────────────── */}
      <SectionCard title="Messaggi ai clienti">
        <p className="text-xs text-gray-400">Mostra un messaggio evidenziato nella homepage dei clienti (notizie, promozioni, avvisi).</p>

        <ToggleRow label="Mostra messaggio" checked={settings.comunicazione.attivo} onChange={(v) => update('comunicazione', { attivo: v })} />

        {settings.comunicazione.attivo && (
          <div className="space-y-5">

            {/* Contenuto */}
            <div className="space-y-3">
              <p className="text-2xs font-semibold uppercase tracking-widest text-gray-400">Contenuto</p>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Titolo</label>
                <input
                  type="text"
                  value={settings.comunicazione.titolo}
                  onChange={(e) => update('comunicazione', { titolo: e.target.value })}
                  placeholder="Es. Novità in catalogo"
                  className="w-full border border-border rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-gray-900"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Testo</label>
                <textarea
                  value={settings.comunicazione.testo}
                  onChange={(e) => update('comunicazione', { testo: e.target.value })}
                  placeholder="Es. Abbiamo aggiunto 50 nuovi prodotti per la stagione primavera/estate."
                  rows={3}
                  className="w-full border border-border rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-gray-900 resize-none"
                />
              </div>
            </div>

            {/* Posizione */}
            <div className="space-y-2">
              <p className="text-2xs font-semibold uppercase tracking-widest text-gray-400">Posizione nella homepage</p>
              <select
                value={settings.comunicazione.posizione}
                onChange={(e) => update('comunicazione', { posizione: e.target.value })}
                className="w-full border border-border rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-gray-900"
              >
                <option value="top">In cima (sopra l&apos;immagine hero)</option>
                <option value="after-cta">Dopo il tasto CTA</option>
                <option value="after-products">Dopo la griglia prodotti</option>
                <option value="bottom">In fondo alla pagina</option>
                <option value="banner-top">Banner fisso in alto</option>
                <option value="banner-bottom">Banner fisso in basso</option>
              </select>
            </div>

            {/* Stile testo */}
            <div className="space-y-3">
              <p className="text-2xs font-semibold uppercase tracking-widest text-gray-400">Stile testo</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Font</label>
                  <select
                    value={settings.comunicazione.font}
                    onChange={(e) => update('comunicazione', { font: e.target.value })}
                    className="w-full border border-border rounded px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-gray-900"
                  >
                    <option value="system">Sistema</option>
                    <option value="serif">Serif</option>
                    <option value="mono">Mono</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Allineamento</label>
                  <select
                    value={settings.comunicazione.allineamento}
                    onChange={(e) => update('comunicazione', { allineamento: e.target.value })}
                    className="w-full border border-border rounded px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-gray-900"
                  >
                    <option value="left">Sinistra</option>
                    <option value="center">Centro</option>
                    <option value="right">Destra</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Dim. titolo (px)</label>
                  <input type="number" min={10} max={40} value={settings.comunicazione.fontSizeTitolo}
                    onChange={(e) => update('comunicazione', { fontSizeTitolo: Number(e.target.value) })}
                    className="w-full border border-border rounded px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-gray-900"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Dim. testo (px)</label>
                  <input type="number" min={10} max={30} value={settings.comunicazione.fontSizeTesto}
                    onChange={(e) => update('comunicazione', { fontSizeTesto: Number(e.target.value) })}
                    className="w-full border border-border rounded px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-gray-900"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Peso titolo</label>
                  <select value={settings.comunicazione.pesoTitolo}
                    onChange={(e) => update('comunicazione', { pesoTitolo: e.target.value })}
                    className="w-full border border-border rounded px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-gray-900"
                  >
                    <option value="normal">Normale</option>
                    <option value="medium">Medium</option>
                    <option value="semibold">Semibold</option>
                    <option value="bold">Bold</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Peso testo</label>
                  <select value={settings.comunicazione.pesoTesto}
                    onChange={(e) => update('comunicazione', { pesoTesto: e.target.value })}
                    className="w-full border border-border rounded px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-gray-900"
                  >
                    <option value="normal">Normale</option>
                    <option value="medium">Medium</option>
                    <option value="semibold">Semibold</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Trasformazione testo</label>
                <select value={settings.comunicazione.trasformazione}
                  onChange={(e) => update('comunicazione', { trasformazione: e.target.value })}
                  className="w-full border border-border rounded px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-gray-900"
                >
                  <option value="none">Nessuna</option>
                  <option value="uppercase">MAIUSCOLO</option>
                  <option value="lowercase">minuscolo</option>
                  <option value="capitalize">Prima Lettera</option>
                </select>
              </div>
              <div className="flex gap-4">
                <ToggleRow label="Titolo corsivo" checked={settings.comunicazione.corsivoTitolo} onChange={(v) => update('comunicazione', { corsivoTitolo: v })} />
                <ToggleRow label="Testo corsivo" checked={settings.comunicazione.corsivoTesto} onChange={(v) => update('comunicazione', { corsivoTesto: v })} />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Colore titolo</label>
                <ColorPickerWithPalette value={settings.comunicazione.coloreTitolo} onChange={(v) => update('comunicazione', { coloreTitolo: v })} />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Colore testo</label>
                <ColorPickerWithPalette value={settings.comunicazione.coloreTesto} onChange={(v) => update('comunicazione', { coloreTesto: v })} />
              </div>
            </div>

            {/* Stile box */}
            <div className="space-y-3">
              <p className="text-2xs font-semibold uppercase tracking-widest text-gray-400">Stile box</p>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Sfondo</label>
                <ColorPickerWithPalette value={settings.comunicazione.sfondo} onChange={(v) => update('comunicazione', { sfondo: v })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Bordo</label>
                  <select value={settings.comunicazione.bordo}
                    onChange={(e) => update('comunicazione', { bordo: e.target.value })}
                    className="w-full border border-border rounded px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-gray-900"
                  >
                    <option value="none">Nessuno</option>
                    <option value="thin">Sottile (1px)</option>
                    <option value="medium">Medio (2px)</option>
                    <option value="thick">Spesso (3px)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Raggio (px)</label>
                  <input type="number" min={0} max={40} value={settings.comunicazione.raggio}
                    onChange={(e) => update('comunicazione', { raggio: Number(e.target.value) })}
                    className="w-full border border-border rounded px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-gray-900"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Ombra</label>
                  <select value={settings.comunicazione.ombra}
                    onChange={(e) => update('comunicazione', { ombra: e.target.value })}
                    className="w-full border border-border rounded px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-gray-900"
                  >
                    <option value="none">Nessuna</option>
                    <option value="sm">Leggera</option>
                    <option value="md">Media</option>
                    <option value="lg">Forte</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Padding (px)</label>
                  <input type="number" min={8} max={48} value={settings.comunicazione.padding}
                    onChange={(e) => update('comunicazione', { padding: Number(e.target.value) })}
                    className="w-full border border-border rounded px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-gray-900"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Colore bordo</label>
                <ColorPickerWithPalette value={settings.comunicazione.coloreBordo} onChange={(v) => update('comunicazione', { coloreBordo: v })} />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Larghezza</label>
                <select value={settings.comunicazione.larghezza}
                  onChange={(e) => update('comunicazione', { larghezza: e.target.value })}
                  className="w-full border border-border rounded px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-gray-900"
                >
                  <option value="full">Piena larghezza</option>
                  <option value="lg">Larga (640px)</option>
                  <option value="md">Media (480px)</option>
                  <option value="sm">Stretta (320px)</option>
                </select>
              </div>
            </div>

            {/* Icona / Emoji */}
            <div className="space-y-3">
              <p className="text-2xs font-semibold uppercase tracking-widest text-gray-400">Icona / Emoji</p>
              <ToggleRow label="Mostra icona" checked={settings.comunicazione.mostraIcona} onChange={(v) => update('comunicazione', { mostraIcona: v })} />
              {settings.comunicazione.mostraIcona && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Emoji</label>
                    <input type="text" value={settings.comunicazione.icona}
                      onChange={(e) => update('comunicazione', { icona: e.target.value })}
                      className="w-full border border-border rounded px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-gray-900"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Posizione icona</label>
                    <select value={settings.comunicazione.posizioneIcona}
                      onChange={(e) => update('comunicazione', { posizioneIcona: e.target.value })}
                      className="w-full border border-border rounded px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-gray-900"
                    >
                      <option value="before">Prima del titolo</option>
                      <option value="after">Dopo il titolo</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Comportamento */}
            <div className="space-y-3">
              <p className="text-2xs font-semibold uppercase tracking-widest text-gray-400">Comportamento</p>
              <ToggleRow label="Chiudibile dall'utente" checked={settings.comunicazione.chiudibile} onChange={(v) => update('comunicazione', { chiudibile: v })} />
              <ToggleRow label="Mostra solo una volta (per sessione)" checked={settings.comunicazione.soloUnaVolta} onChange={(v) => update('comunicazione', { soloUnaVolta: v })} />
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Scadenza (lascia vuoto per nessuna)</label>
                <input type="date" value={settings.comunicazione.scadenza}
                  onChange={(e) => update('comunicazione', { scadenza: e.target.value })}
                  className="w-full border border-border rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-gray-900"
                />
              </div>
            </div>

            {/* Preview */}
            <div className="space-y-2">
              <p className="text-2xs font-semibold uppercase tracking-widest text-gray-400">Anteprima</p>
              <ComunicazionePreview cs={settings.comunicazione} />
            </div>

          </div>
        )}
        <SaveButton onClick={() => saveSection(comunicazioneKeys, 'Comunicazione')} loading={saving === 'Comunicazione'} />
      </SectionCard>

      {/* ── Filtri catalogo cliente ───────────────────────────── */}
      <SectionCard title="Filtri catalogo cliente">
        <p className="text-xs text-gray-400">
          Seleziona i filtri visibili nella sezione catalogo clienti. Se nessun filtro è selezionato, vengono mostrati tutti.
        </p>
        <div className="space-y-2">
          {ALL_CATALOG_FILTERS.map(({ key, label }) => (
            <ToggleRow
              key={key}
              label={label}
              checked={filtriVisibili.length === 0 || filtriVisibili.includes(key)}
              onChange={() => {
                if (filtriVisibili.length === 0) {
                  // Passa da "tutti" a "tutti tranne questo"
                  setFiltriVisibili(ALL_CATALOG_FILTERS.map(f => f.key).filter(k => k !== key));
                } else {
                  toggleFiltro(key);
                }
              }}
            />
          ))}
        </div>
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={() => setFiltriVisibili([])}
            className="text-xs text-gray-400 hover:text-primary transition-colors"
          >
            Abilita tutti
          </button>
          <button
            onClick={saveFiltriCatalogo}
            disabled={savingFiltri}
            className="px-4 py-2 bg-gray-900 text-white text-xs font-medium rounded hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            {savingFiltri ? 'Salvataggio…' : 'Salva'}
          </button>
        </div>
      </SectionCard>
    </div>
  );
}
