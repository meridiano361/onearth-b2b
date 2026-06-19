'use client';

import { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { GripVertical, ImageIcon, ChevronDown } from 'lucide-react';
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
import { SOCIAL_KEYS } from '@/lib/settingsHelpers';

// ─── Types ────────────────────────────────────────────────────────────────────

type SettingsFlat = Record<string, string>;

type CollectionData = {
  menu: AppSettingsData['menu'];
  scheda: AppSettingsData['scheda'];
  card: AppSettingsData['card'];
  ordine: AppSettingsData['ordine'];
  filtriVisibili: string[];
};

const DEFAULT_COLLECTION_DATA: CollectionData = {
  menu: DEFAULT_APP_SETTINGS.menu,
  scheda: DEFAULT_APP_SETTINGS.scheda,
  card: DEFAULT_APP_SETTINGS.card,
  ordine: DEFAULT_APP_SETTINGS.ordine,
  filtriVisibili: [],
};

function settingsToFlat(s: AppSettingsData): SettingsFlat {
  const f: SettingsFlat = {};
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
  f['login.sfondoUrl'] = s.login.sfondoUrl;
  f['login.caption'] = s.login.caption;
  f['social.ordine'] = JSON.stringify(s.social.ordine);
  for (const [k, v] of Object.entries(s.social.items)) {
    f[`social.${k}.visibile`] = String(v.visibile);
    f[`social.${k}.url`] = v.url;
  }
  f['menu.ordine'] = JSON.stringify(s.menu.ordine);
  for (const [k, v] of Object.entries(s.menu.items)) {
    f[`menu.${k}.label`] = v.label;
    f[`menu.${k}.visibile`] = String(v.visibile);
  }
  for (const [k, v] of Object.entries(s.scheda)) f[`scheda.${k}`] = String(v);
  for (const [k, v] of Object.entries(s.card)) f[`card.${k}`] = String(v);
  f['colori.sfondo'] = s.colori.sfondo;
  f['colori.pulsanti'] = s.colori.pulsanti;
  f['colori.testoPulsanti'] = s.colori.testoPulsanti;
  f['colori.testo'] = s.colori.testo;
  for (const [k, v] of Object.entries(s.ordine)) f[`ordine.${k}`] = String(v);
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
  f['comunicazione2.attivo']         = String(s.comunicazione2.attivo);
  f['comunicazione2.titolo']         = s.comunicazione2.titolo;
  f['comunicazione2.testo']          = s.comunicazione2.testo;
  f['comunicazione2.colore']         = s.comunicazione2.colore;
  f['comunicazione2.posizione']      = s.comunicazione2.posizione;
  f['comunicazione2.font']           = s.comunicazione2.font;
  f['comunicazione2.fontSizeTitolo'] = String(s.comunicazione2.fontSizeTitolo);
  f['comunicazione2.fontSizeTesto']  = String(s.comunicazione2.fontSizeTesto);
  f['comunicazione2.pesoTitolo']     = s.comunicazione2.pesoTitolo;
  f['comunicazione2.pesoTesto']      = s.comunicazione2.pesoTesto;
  f['comunicazione2.allineamento']   = s.comunicazione2.allineamento;
  f['comunicazione2.trasformazione'] = s.comunicazione2.trasformazione;
  f['comunicazione2.corsivoTitolo']  = String(s.comunicazione2.corsivoTitolo);
  f['comunicazione2.corsivoTesto']   = String(s.comunicazione2.corsivoTesto);
  f['comunicazione2.sfondo']         = s.comunicazione2.sfondo;
  f['comunicazione2.coloreTesto']    = s.comunicazione2.coloreTesto;
  f['comunicazione2.coloreTitolo']   = s.comunicazione2.coloreTitolo;
  f['comunicazione2.bordo']          = s.comunicazione2.bordo;
  f['comunicazione2.coloreBordo']    = s.comunicazione2.coloreBordo;
  f['comunicazione2.raggio']         = String(s.comunicazione2.raggio);
  f['comunicazione2.ombra']          = s.comunicazione2.ombra;
  f['comunicazione2.padding']        = String(s.comunicazione2.padding);
  f['comunicazione2.larghezza']      = s.comunicazione2.larghezza;
  f['comunicazione2.mostraIcona']    = String(s.comunicazione2.mostraIcona);
  f['comunicazione2.icona']          = s.comunicazione2.icona;
  f['comunicazione2.posizioneIcona'] = s.comunicazione2.posizioneIcona;
  f['comunicazione2.chiudibile']     = String(s.comunicazione2.chiudibile);
  f['comunicazione2.soloUnaVolta']   = String(s.comunicazione2.soloUnaVolta);
  f['comunicazione2.scadenza']       = s.comunicazione2.scadenza;
  return f;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function SectionCard({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white border border-border rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
      >
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500">{title}</h2>
        <ChevronDown size={14} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="px-5 pb-5 space-y-4 border-t border-border pt-4">{children}</div>}
    </div>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between cursor-pointer select-none">
      <span className="text-sm text-gray-700">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-5 rounded-full transition-colors ${checked ? 'bg-gray-900' : 'bg-gray-300'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
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

function ColorPickerWithPalette({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const palette = ['#FFFFFF','#F5F0EA','#FFFBEB','#F3F4F6','#111827','#374151','#6B7280',
                   '#C17A5A','#B45309','#DC2626','#2563EB','#059669','#7C3AED'];
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {palette.map(c => (
          <button key={c} type="button" onClick={() => onChange(c)} title={c}
            className="w-6 h-6 rounded border border-border transition-transform hover:scale-110"
            style={{ backgroundColor: c, outline: value === c ? '2px solid #111827' : undefined, outlineOffset: '2px' }}
          />
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="w-8 h-8 rounded border border-border cursor-pointer flex-shrink-0" />
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className="flex-1 border border-border rounded px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-gray-900 font-mono" />
      </div>
    </div>
  );
}

function ComunicazionePreview({ cs }: { cs: AppSettingsData['comunicazione'] }) {
  const fontFamily = cs.font === 'system' ? undefined : cs.font === 'serif' ? 'Georgia, serif' : 'monospace';
  const borderWidth = cs.bordo === 'none' ? 0 : cs.bordo === 'thin' ? 1 : cs.bordo === 'medium' ? 2 : 3;
  const boxShadow = cs.ombra === 'sm' ? '0 1px 3px rgba(0,0,0,0.12)' : cs.ombra === 'md' ? '0 4px 12px rgba(0,0,0,0.15)' : cs.ombra === 'lg' ? '0 8px 24px rgba(0,0,0,0.18)' : undefined;
  const maxWidth = cs.larghezza === 'sm' ? '320px' : cs.larghezza === 'md' ? '480px' : cs.larghezza === 'lg' ? '640px' : '100%';
  const textAlign = cs.allineamento as React.CSSProperties['textAlign'];
  const titleEl = cs.titolo ? (
    <p style={{ fontSize: cs.fontSizeTitolo, fontWeight: cs.pesoTitolo, fontStyle: cs.corsivoTitolo ? 'italic' : undefined, textTransform: cs.trasformazione as React.CSSProperties['textTransform'], color: cs.coloreTitolo, margin: 0, fontFamily }}>
      {cs.titolo}
    </p>
  ) : null;
  const textEl = cs.testo ? (
    <p style={{ fontSize: cs.fontSizeTesto, fontWeight: cs.pesoTesto, fontStyle: cs.corsivoTesto ? 'italic' : undefined, color: cs.coloreTesto, margin: 0, fontFamily }}>
      {cs.testo}
    </p>
  ) : null;
  const icon = cs.mostraIcona && cs.icona ? <span style={{ fontSize: cs.fontSizeTitolo + 2 }}>{cs.icona}</span> : null;
  return (
    <div style={{ maxWidth }}>
      <div style={{ backgroundColor: cs.sfondo, borderRadius: cs.raggio, borderWidth, borderStyle: borderWidth > 0 ? 'solid' : undefined, borderColor: cs.coloreBordo, padding: cs.padding, boxShadow, textAlign }}>
        {cs.posizioneIcona === 'before' ? (
          <div style={{ display: 'flex', flexDirection: cs.allineamento === 'center' ? 'column' : 'row', alignItems: cs.allineamento === 'center' ? 'center' : 'flex-start', gap: 8 }}>
            {icon}
            <div style={{ flex: 1 }}>{titleEl}{titleEl && textEl && <div style={{ height: 4 }} />}{textEl}</div>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', justifyContent: cs.allineamento === 'right' ? 'flex-end' : cs.allineamento === 'center' ? 'center' : 'flex-start', gap: 8 }}>
              {titleEl}{icon}
            </div>
            {titleEl && textEl && <div style={{ height: 4 }} />}{textEl}
          </div>
        )}
        {cs.chiudibile && <div style={{ textAlign: 'right', marginTop: 8 }}><span style={{ fontSize: 11, color: cs.coloreTesto, opacity: 0.5, cursor: 'pointer' }}>✕ chiudi</span></div>}
      </div>
    </div>
  );
}

// ─── DnD sortable menu item ───────────────────────────────────────────────────

interface MenuItemDef { key: string; label: string; visibile: boolean; }

function SortableMenuItem({ item, onChange }: { item: MenuItemDef; onChange: (key: string, field: 'label' | 'visibile', value: string | boolean) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.key });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-3 bg-gray-50 border border-border rounded-lg px-3 py-2.5">
      <button {...attributes} {...listeners} type="button" className="cursor-grab text-gray-400 hover:text-gray-600"><GripVertical size={14} /></button>
      <input type="text" value={item.label} onChange={(e) => onChange(item.key, 'label', e.target.value)} className="flex-1 text-sm bg-white border border-border rounded px-2 py-1 outline-none focus:ring-1 focus:ring-gray-900 text-primary" />
      <button type="button" onClick={() => onChange(item.key, 'visibile', !item.visibile)} className={`relative w-9 h-[18px] rounded-full transition-colors flex-shrink-0 ${item.visibile ? 'bg-gray-900' : 'bg-gray-300'}`}>
        <span className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-transform ${item.visibile ? 'translate-x-[18px]' : ''}`} />
      </button>
    </div>
  );
}

// ─── Image upload input ───────────────────────────────────────────────────────

function ImageUploadInput({ label, value, onChange }: { label: string; value: string; onChange: (url: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const fileRef = { current: null as HTMLInputElement | null };
  async function handleFile(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const json = await res.json();
      if (json.url) onChange(json.url);
      else toast.error(json.error ?? 'Upload fallito');
    } catch { toast.error("Errore durante l'upload"); }
    finally { setUploading(false); }
  }
  return (
    <div>
      <label className="text-xs text-gray-500 mb-1.5 block">{label}</label>
      <div className="flex gap-3 items-start">
        <div className="w-16 h-16 rounded border border-border overflow-hidden flex-shrink-0 bg-gray-50 flex items-center justify-center">
          {value ? <img src={value} alt={label} className="w-full h-full object-cover" /> : <ImageIcon size={20} className="text-gray-300" />}
        </div>
        <div className="flex-1 space-y-1.5">
          <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder="https://..." className="w-full border border-border rounded px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-gray-900 text-gray-600" />
          <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="px-3 py-1.5 bg-gray-100 text-xs font-medium rounded hover:bg-gray-200 disabled:opacity-50 transition-colors">
            {uploading ? 'Caricamento…' : 'Carica immagine'}
          </button>
          <input ref={fileRef as React.RefObject<HTMLInputElement>} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }} />
        </div>
      </div>
    </div>
  );
}

// ─── DnD sortable social item ─────────────────────────────────────────────────

const SOCIAL_LABELS: Record<string, string> = { instagram: 'Instagram', facebook: 'Facebook', pinterest: 'Pinterest', tiktok: 'TikTok', website: 'Website', podcast: 'Podcast' };
interface SocialItemDef { key: string; visibile: boolean; url: string; }

function SortableSocialItem({ item, onChange }: { item: SocialItemDef; onChange: (key: string, field: 'visibile' | 'url', value: string | boolean) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.key });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  return (
    <div ref={setNodeRef} style={style} className="bg-gray-50 border border-border rounded-lg px-3 py-2.5 space-y-1.5">
      <div className="flex items-center gap-3">
        <button {...attributes} {...listeners} type="button" className="cursor-grab text-gray-400 hover:text-gray-600"><GripVertical size={14} /></button>
        <span className="text-sm font-medium text-gray-700 flex-1">{SOCIAL_LABELS[item.key] ?? item.key}</span>
        <button type="button" onClick={() => onChange(item.key, 'visibile', !item.visibile)} className={`relative w-9 h-[18px] rounded-full transition-colors flex-shrink-0 ${item.visibile ? 'bg-gray-900' : 'bg-gray-300'}`}>
          <span className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-transform ${item.visibile ? 'translate-x-[18px]' : ''}`} />
        </button>
      </div>
      <input type="url" value={item.url} onChange={(e) => onChange(item.key, 'url', e.target.value)} placeholder="https://..." className="w-full border border-border rounded px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-gray-900 text-gray-600 ml-5" />
    </div>
  );
}

// ─── Collection panel ─────────────────────────────────────────────────────────

const SCHEDA_FIELDS: [keyof AppSettingsData['scheda'], string][] = [
  ['codice', 'Codice prodotto'], ['descrizione', 'Descrizione'], ['produttore', 'Produttore'],
  ['paese', 'Paese'], ['misure', 'Misure'], ['linea', 'Linea'], ['collezione', 'Collezione'],
  ['colore', 'Colore'], ['temaColore', 'Tema colore'], ['confezione', 'Confezione (lotto)'],
  ['iva', 'IVA'], ['prezzoCosto', 'Prezzo costo'], ['pvp', 'Prezzo vendita (PVP)'],
  ['fasciaSconto', 'Fascia sconto'], ['fasciaRicarico', 'Fascia ricarico'],
  ['margine', 'Margine %'], ['guadagnoPotenziale', 'Guadagno potenziale'], ['note', 'Note'],
];

const CARD_FIELDS: [keyof AppSettingsData['card'], string][] = [
  ['codice', 'Codice prodotto'], ['prezzoCosto', 'Prezzo costo'], ['pvp', 'Prezzo vendita (PVP)'],
  ['aggiungi', 'Pulsante Aggiungi'], ['badgeNuovo', 'Badge NUOVO'], ['cuoricino', 'Icona preferiti (cuoricino)'],
];

const ORDINE_FIELDS: [keyof AppSettingsData['ordine'], string][] = [
  ['mostraBudget', 'Budget destinazione'], ['mostraCosto', 'Costo ordine (prezzo costo i.e. totale)'],
  ['mostraVendite', 'Vendite potenziali (PVP totale i.i.)'], ['mostraGuadagno', 'Guadagno potenziale'],
  ['mostraMargine', 'Margine medio %'], ['mostraRimanente', 'Rimangono (budget residuo)'],
];

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

interface CollectionPanelProps {
  data: CollectionData;
  onChange: (patch: Partial<CollectionData>) => void;
  saving: string | null;
  savingFiltri: boolean;
  savingPrefix: string;
  onSaveMenu: () => void;
  onSaveScheda: () => void;
  onSaveCard: () => void;
  onSaveOrdine: () => void;
  onSaveFiltri: () => void;
  sensors: ReturnType<typeof useSensors>;
}

function CollectionPanel({ data, onChange, saving, savingFiltri, savingPrefix, onSaveMenu, onSaveScheda, onSaveCard, onSaveOrdine, onSaveFiltri, sensors }: CollectionPanelProps) {
  const { menu, scheda, card, ordine, filtriVisibili } = data;

  function handleMenuDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = menu.ordine.indexOf(String(active.id));
    const newIndex = menu.ordine.indexOf(String(over.id));
    onChange({ menu: { ...menu, ordine: arrayMove(menu.ordine, oldIndex, newIndex) } });
  }

  function handleMenuItemChange(key: string, field: 'label' | 'visibile', value: string | boolean) {
    onChange({ menu: { ...menu, items: { ...menu.items, [key]: { ...menu.items[key], [field]: value } } } });
  }

  return (
    <div className="space-y-3">
      <SectionCard title="Menu navigazione">
        <p className="text-xs text-gray-400">Trascina per riordinare · modifica il nome · usa il toggle per mostrare/nascondere.</p>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleMenuDragEnd}>
          <SortableContext items={menu.ordine} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {menu.ordine.map(key => (
                <SortableMenuItem key={key} item={{ key, ...menu.items[key] }} onChange={handleMenuItemChange} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
        <SaveButton onClick={onSaveMenu} loading={saving === `${savingPrefix}-Menu`} />
      </SectionCard>

      <SectionCard title="Scheda prodotto">
        <div className="space-y-2">
          {SCHEDA_FIELDS.map(([k, label]) => (
            <ToggleRow key={k} label={label} checked={scheda[k]} onChange={v => onChange({ scheda: { ...scheda, [k]: v } })} />
          ))}
        </div>
        <SaveButton onClick={onSaveScheda} loading={saving === `${savingPrefix}-Scheda`} />
      </SectionCard>

      <SectionCard title="Card catalogo">
        <div className="space-y-2">
          {CARD_FIELDS.map(([k, label]) => (
            <ToggleRow key={k} label={label} checked={card[k]} onChange={v => onChange({ card: { ...card, [k]: v } })} />
          ))}
        </div>
        <SaveButton onClick={onSaveCard} loading={saving === `${savingPrefix}-Card`} />
      </SectionCard>

      <SectionCard title="Dati finanziari ordine">
        <p className="text-xs text-gray-400">Scegli quali campi finanziari mostrare al cliente nella barra ordine e nella pagina ordini.</p>
        <div className="space-y-2">
          {ORDINE_FIELDS.map(([k, label]) => (
            <ToggleRow key={k} label={label} checked={ordine[k]} onChange={v => onChange({ ordine: { ...ordine, [k]: v } })} />
          ))}
        </div>
        <SaveButton onClick={onSaveOrdine} loading={saving === `${savingPrefix}-Ordine`} />
      </SectionCard>

      <SectionCard title="Filtri catalogo cliente">
        <p className="text-xs text-gray-400">Seleziona i filtri visibili nel catalogo. Se nessun filtro è selezionato, vengono mostrati tutti.</p>
        <div className="space-y-2">
          {ALL_CATALOG_FILTERS.map(({ key, label }) => (
            <ToggleRow
              key={key}
              label={label}
              checked={filtriVisibili.length === 0 || filtriVisibili.includes(key)}
              onChange={() => {
                if (filtriVisibili.length === 0) {
                  onChange({ filtriVisibili: ALL_CATALOG_FILTERS.map(f => f.key).filter(k => k !== key) });
                } else {
                  const next = filtriVisibili.includes(key) ? filtriVisibili.filter(k => k !== key) : [...filtriVisibili, key];
                  onChange({ filtriVisibili: next });
                }
              }}
            />
          ))}
        </div>
        <div className="flex items-center justify-between pt-2">
          <button onClick={() => onChange({ filtriVisibili: [] })} className="text-xs text-gray-400 hover:text-primary transition-colors">Abilita tutti</button>
          <button onClick={onSaveFiltri} disabled={savingFiltri} className="px-4 py-2 bg-gray-900 text-white text-xs font-medium rounded hover:bg-gray-700 disabled:opacity-50 transition-colors">
            {savingFiltri ? 'Salvataggio…' : 'Salva'}
          </button>
        </div>
      </SectionCard>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AdminPersonalizzazionePage() {
  const [settings, setSettings] = useState<AppSettingsData>(DEFAULT_APP_SETTINGS);
  const [saving, setSaving] = useState<string | null>(null);
  const [activeCollection, setActiveCollection] = useState<'casa' | 'moda'>('casa');

  // Casa filtri (from catalog-settings singleton)
  const [casaFiltriVisibili, setCasaFiltriVisibili] = useState<string[]>([]);
  const [savingCasaFiltri, setSavingCasaFiltri] = useState(false);

  // Moda collection data
  const [modaData, setModaData] = useState<CollectionData>(DEFAULT_COLLECTION_DATA);
  const [savingModaFiltri, setSavingModaFiltri] = useState(false);

  useEffect(() => {
    fetch('/api/admin/catalog-settings')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d.filtriVisibili)) setCasaFiltriVisibili(d.filtriVisibili); })
      .catch(() => {});
  }, []);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const { isLoading } = useQuery({
    queryKey: ['admin-personalizzazione'],
    queryFn: async () => {
      const res = await fetch('/api/settings/public');
      if (!res.ok) return null;
      const flat = await res.json() as Record<string, string>;

      // Global (casa) settings — exclude moda.* keys
      const globalRecords = Object.entries(flat)
        .filter(([k]) => !k.startsWith('moda.'))
        .map(([chiave, valore]) => ({ chiave, valore }));
      const parsed = parseSettingsFromDb(globalRecords);
      setSettings(parsed);

      // Moda settings — strip "moda." prefix and parse as if global
      const modaRecords = Object.entries(flat)
        .filter(([k]) => k.startsWith('moda.') && k !== 'moda.filtriVisibili')
        .map(([k, valore]) => ({ chiave: k.slice('moda.'.length), valore }));
      if (modaRecords.length > 0) {
        const parsedModa = parseSettingsFromDb(modaRecords);
        let modaFiltri: string[] = [];
        try { const raw = flat['moda.filtriVisibili']; if (raw) modaFiltri = JSON.parse(raw); } catch {}
        setModaData({ menu: parsedModa.menu, scheda: parsedModa.scheda, card: parsedModa.card, ordine: parsedModa.ordine, filtriVisibili: modaFiltri });
      }

      return parsed;
    },
    staleTime: 0,
  });

  const update = useCallback(<K extends keyof AppSettingsData>(section: K, patch: Partial<AppSettingsData[K]>) => {
    setSettings(prev => ({ ...prev, [section]: { ...prev[section], ...patch } }));
  }, []);

  async function saveSection(keys: string[], label: string) {
    setSaving(label);
    const flat = settingsToFlat(settings);
    const body: SettingsFlat = {};
    for (const k of keys) { if (flat[k] !== undefined) body[k] = flat[k]; }
    try {
      const res = await fetch('/api/admin/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error();
      toast.success(`${label.replace(/^(casa|moda)-/, '')} salvato`);
    } catch { toast.error('Errore nel salvataggio'); }
    finally { setSaving(null); }
  }

  async function saveModaSection(keys: string[], label: string) {
    setSaving(label);
    const synth: AppSettingsData = { ...DEFAULT_APP_SETTINGS, menu: modaData.menu, scheda: modaData.scheda, card: modaData.card, ordine: modaData.ordine };
    const flat = settingsToFlat(synth);
    const body: SettingsFlat = {};
    for (const k of keys) { if (flat[k] !== undefined) body[`moda.${k}`] = flat[k]; }
    try {
      const res = await fetch('/api/admin/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error();
      toast.success(`${label.replace(/^moda-/, '')} Moda salvato`);
    } catch { toast.error('Errore nel salvataggio'); }
    finally { setSaving(null); }
  }

  async function saveCasaFiltri() {
    setSavingCasaFiltri(true);
    try {
      const res = await fetch('/api/admin/catalog-settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ filtriVisibili: casaFiltriVisibili }) });
      if (!res.ok) throw new Error();
      toast.success('Filtri Casa salvati');
    } catch { toast.error('Errore nel salvataggio'); }
    finally { setSavingCasaFiltri(false); }
  }

  async function saveModaFiltri() {
    setSavingModaFiltri(true);
    try {
      const res = await fetch('/api/admin/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ 'moda.filtriVisibili': JSON.stringify(modaData.filtriVisibili) }) });
      if (!res.ok) throw new Error();
      toast.success('Filtri Moda salvati');
    } catch { toast.error('Errore nel salvataggio'); }
    finally { setSavingModaFiltri(false); }
  }

  function handleSocialDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = settings.social.ordine.indexOf(String(active.id));
    const newIndex = settings.social.ordine.indexOf(String(over.id));
    update('social', { ordine: arrayMove(settings.social.ordine, oldIndex, newIndex) });
  }

  function handleSocialItemChange(key: string, field: 'visibile' | 'url', value: string | boolean) {
    update('social', { items: { ...settings.social.items, [key]: { ...settings.social.items[key], [field]: value } } });
  }

  // Key arrays for saving
  const homeKeys = ['home.titolo1','home.titolo1.maiuscolo','home.titolo1.colore','home.titolo1.size','home.titolo1.font','home.titolo1.weight','home.titolo1.lineHeight','home.titolo1.letterSpacing','home.titolo1.transform','home.titolo2','home.titolo2.colore','home.titolo2.size','home.titolo2.font','home.titolo2.weight','home.titolo2.lineHeight','home.titolo2.letterSpacing','home.titolo2.transform','home.cta','home.scrollAttivo','home.scrollNumero','home.scrollCollezione','home.editorialAttivo','home.editorialUrl','home.editorialCaption'];
  const loginKeys = ['login.sfondoUrl', 'login.caption'];
  const coloriKeys = ['colori.sfondo', 'colori.pulsanti', 'colori.testoPulsanti', 'colori.testo'];
  const socialKeys = ['social.ordine', ...SOCIAL_KEYS.flatMap(k => [`social.${k}.visibile`, `social.${k}.url`])];
  const comunicazioneKeys = ['comunicazione.attivo','comunicazione.titolo','comunicazione.testo','comunicazione.colore','comunicazione.posizione','comunicazione.font','comunicazione.fontSizeTitolo','comunicazione.fontSizeTesto','comunicazione.pesoTitolo','comunicazione.pesoTesto','comunicazione.allineamento','comunicazione.trasformazione','comunicazione.corsivoTitolo','comunicazione.corsivoTesto','comunicazione.sfondo','comunicazione.coloreTesto','comunicazione.coloreTitolo','comunicazione.bordo','comunicazione.coloreBordo','comunicazione.raggio','comunicazione.ombra','comunicazione.padding','comunicazione.larghezza','comunicazione.mostraIcona','comunicazione.icona','comunicazione.posizioneIcona','comunicazione.chiudibile','comunicazione.soloUnaVolta','comunicazione.scadenza'];
  const comunicazione2Keys = ['comunicazione2.attivo','comunicazione2.titolo','comunicazione2.testo','comunicazione2.colore','comunicazione2.posizione','comunicazione2.font','comunicazione2.fontSizeTitolo','comunicazione2.fontSizeTesto','comunicazione2.pesoTitolo','comunicazione2.pesoTesto','comunicazione2.allineamento','comunicazione2.trasformazione','comunicazione2.corsivoTitolo','comunicazione2.corsivoTesto','comunicazione2.sfondo','comunicazione2.coloreTesto','comunicazione2.coloreTitolo','comunicazione2.bordo','comunicazione2.coloreBordo','comunicazione2.raggio','comunicazione2.ombra','comunicazione2.padding','comunicazione2.larghezza','comunicazione2.mostraIcona','comunicazione2.icona','comunicazione2.posizioneIcona','comunicazione2.chiudibile','comunicazione2.soloUnaVolta','comunicazione2.scadenza'];
  const casaMenuKeys = ['menu.ordine', ...settings.menu.ordine.flatMap(k => [`menu.${k}.label`, `menu.${k}.visibile`])];
  const casaSchedaKeys = Object.keys(settings.scheda).map(k => `scheda.${k}`);
  const casaCardKeys = Object.keys(settings.card).map(k => `card.${k}`);
  const casaOrdineKeys = Object.keys(settings.ordine).map(k => `ordine.${k}`);
  const modaMenuKeys = ['menu.ordine', ...modaData.menu.ordine.flatMap(k => [`menu.${k}.label`, `menu.${k}.visibile`])];
  const modaSchedaKeys = Object.keys(modaData.scheda).map(k => `scheda.${k}`);
  const modaCardKeys = Object.keys(modaData.card).map(k => `card.${k}`);
  const modaOrdineKeys = Object.keys(modaData.ordine).map(k => `ordine.${k}`);

  // Casa collection as CollectionData (backed by global settings state)
  const casaData: CollectionData = { menu: settings.menu, scheda: settings.scheda, card: settings.card, ordine: settings.ordine, filtriVisibili: casaFiltriVisibili };

  function onCasaChange(patch: Partial<CollectionData>) {
    if (patch.menu !== undefined) setSettings(prev => ({ ...prev, menu: patch.menu! }));
    if (patch.scheda !== undefined) setSettings(prev => ({ ...prev, scheda: patch.scheda! }));
    if (patch.card !== undefined) setSettings(prev => ({ ...prev, card: patch.card! }));
    if (patch.ordine !== undefined) setSettings(prev => ({ ...prev, ordine: patch.ordine! }));
    if (patch.filtriVisibili !== undefined) setCasaFiltriVisibili(patch.filtriVisibili!);
  }

  if (isLoading) return <div className="p-8 text-sm text-gray-400">Caricamento impostazioni…</div>;

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-8">
      <h1 className="text-lg font-semibold text-primary">Personalizzazione</h1>

      {/* ── Impostazioni generali ─────────────────────────────── */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-3">Impostazioni generali</p>
        <div className="space-y-3">

          {/* Homepage */}
          <SectionCard title="Homepage">
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-2xs font-semibold uppercase tracking-widest text-gray-400">Titolo 1</p>
                <input type="text" value={settings.home.titolo1} onChange={(e) => update('home', { titolo1: e.target.value })} className="w-full border border-border rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-gray-900" />
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
                      <option value="none">Nessuna</option><option value="uppercase">MAIUSCOLO</option><option value="lowercase">minuscolo</option><option value="capitalize">Prima Lettera</option>
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

              <div className="space-y-2 pt-2 border-t border-border">
                <p className="text-2xs font-semibold uppercase tracking-widest text-gray-400">Titolo 2</p>
                <input type="text" value={settings.home.titolo2} onChange={(e) => update('home', { titolo2: e.target.value })} className="w-full border border-border rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-gray-900" />
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
                      <option value="none">Nessuna</option><option value="uppercase">MAIUSCOLO</option><option value="lowercase">minuscolo</option><option value="capitalize">Prima Lettera</option>
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

              <div className="space-y-3 pt-2 border-t border-border">
                <ToggleRow label="Mostra foto editoriale" checked={settings.home.editorialAttivo} onChange={(v) => update('home', { editorialAttivo: v })} />
                {settings.home.editorialAttivo && (
                  <>
                    <ImageUploadInput label="Foto editoriale" value={settings.home.editorialUrl} onChange={(url) => update('home', { editorialUrl: url })} />
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Didascalia (opzionale)</label>
                      <input type="text" value={settings.home.editorialCaption} onChange={(e) => update('home', { editorialCaption: e.target.value })} placeholder="Es. Collezione CASA 2027" className="w-full border border-border rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-gray-900" />
                    </div>
                  </>
                )}
              </div>
            </div>
            <SaveButton onClick={() => saveSection(homeKeys, 'Homepage')} loading={saving === 'Homepage'} />
          </SectionCard>

          {/* Colori tema */}
          <SectionCard title="Colori tema">
            <div className="space-y-3">
              {([['sfondo','Sfondo'],['pulsanti','Pulsanti'],['testoPulsanti','Testo pulsanti'],['testo','Testo principale']] as [keyof AppSettingsData['colori'], string][]).map(([k, label]) => (
                <div key={k} className="flex items-center gap-3">
                  <input type="color" value={settings.colori[k]} onChange={(e) => update('colori', { [k]: e.target.value } as Partial<AppSettingsData['colori']>)} className="w-9 h-9 rounded border border-border cursor-pointer flex-shrink-0" />
                  <span className="text-sm text-gray-700 w-36 flex-shrink-0">{label}</span>
                  <input type="text" value={settings.colori[k]} onChange={(e) => update('colori', { [k]: e.target.value } as Partial<AppSettingsData['colori']>)} className="flex-1 border border-border rounded px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-gray-900" />
                </div>
              ))}
            </div>
            <SaveButton onClick={() => saveSection(coloriKeys, 'Colori')} loading={saving === 'Colori'} />
          </SectionCard>

          {/* Social media */}
          <SectionCard title="Social media">
            <p className="text-xs text-gray-400">Trascina per riordinare · usa il toggle per mostrare/nascondere · modifica il link per personalizzare l&apos;URL.</p>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSocialDragEnd}>
              <SortableContext items={settings.social.ordine} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {settings.social.ordine.map(key => (
                    <SortableSocialItem key={key} item={{ key, ...settings.social.items[key] }} onChange={handleSocialItemChange} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
            <SaveButton onClick={() => saveSection(socialKeys, 'Social')} loading={saving === 'Social'} />
          </SectionCard>

          {/* Pagina di accesso */}
          <SectionCard title="Pagina di accesso">
            <p className="text-xs text-gray-400">Personalizza il pannello visivo della pagina di login (visibile solo su desktop, lato sinistro).</p>
            <ImageUploadInput label="Immagine di sfondo" value={settings.login.sfondoUrl} onChange={(url) => update('login', { sfondoUrl: url })} />
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Didascalia</label>
              <input type="text" value={settings.login.caption} onChange={(e) => update('login', { caption: e.target.value })} placeholder="Es. Collezione CASA 2027" className="w-full border border-border rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-gray-900" />
            </div>
            <SaveButton onClick={() => saveSection(loginKeys, 'Login')} loading={saving === 'Login'} />
          </SectionCard>

          {/* Messaggi ai clienti */}
          <SectionCard title="Messaggi ai clienti">
            <p className="text-xs text-gray-400">Mostra un messaggio evidenziato nella homepage dei clienti (notizie, promozioni, avvisi).</p>
            <ToggleRow label="Mostra messaggio" checked={settings.comunicazione.attivo} onChange={(v) => update('comunicazione', { attivo: v })} />
            {settings.comunicazione.attivo && (
              <div className="space-y-5">
                <div className="space-y-3">
                  <p className="text-2xs font-semibold uppercase tracking-widest text-gray-400">Contenuto</p>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Titolo</label>
                    <input type="text" value={settings.comunicazione.titolo} onChange={(e) => update('comunicazione', { titolo: e.target.value })} placeholder="Es. Novità in catalogo" className="w-full border border-border rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-gray-900" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Testo</label>
                    <textarea value={settings.comunicazione.testo} onChange={(e) => update('comunicazione', { testo: e.target.value })} placeholder="Es. Abbiamo aggiunto 50 nuovi prodotti..." rows={3} className="w-full border border-border rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-gray-900 resize-none" />
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-2xs font-semibold uppercase tracking-widest text-gray-400">Posizione nella homepage</p>
                  <select value={settings.comunicazione.posizione} onChange={(e) => update('comunicazione', { posizione: e.target.value })} className="w-full border border-border rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-gray-900">
                    <option value="top">In cima (sopra l&apos;immagine hero)</option>
                    <option value="after-cta">Dopo il tasto CTA</option>
                    <option value="after-products">Dopo la griglia prodotti</option>
                    <option value="bottom">In fondo alla pagina</option>
                    <option value="banner-top">Banner fisso in alto</option>
                    <option value="banner-bottom">Banner fisso in basso</option>
                  </select>
                </div>
                <div className="space-y-3">
                  <p className="text-2xs font-semibold uppercase tracking-widest text-gray-400">Stile testo</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Font</label>
                      <select value={settings.comunicazione.font} onChange={(e) => update('comunicazione', { font: e.target.value })} className="w-full border border-border rounded px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-gray-900">
                        <option value="system">Sistema</option><option value="serif">Serif</option><option value="mono">Mono</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Allineamento</label>
                      <select value={settings.comunicazione.allineamento} onChange={(e) => update('comunicazione', { allineamento: e.target.value })} className="w-full border border-border rounded px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-gray-900">
                        <option value="left">Sinistra</option><option value="center">Centro</option><option value="right">Destra</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Dim. titolo (px)</label>
                      <input type="number" min={10} max={40} value={settings.comunicazione.fontSizeTitolo} onChange={(e) => update('comunicazione', { fontSizeTitolo: Number(e.target.value) })} className="w-full border border-border rounded px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-gray-900" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Dim. testo (px)</label>
                      <input type="number" min={10} max={30} value={settings.comunicazione.fontSizeTesto} onChange={(e) => update('comunicazione', { fontSizeTesto: Number(e.target.value) })} className="w-full border border-border rounded px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-gray-900" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Peso titolo</label>
                      <select value={settings.comunicazione.pesoTitolo} onChange={(e) => update('comunicazione', { pesoTitolo: e.target.value })} className="w-full border border-border rounded px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-gray-900">
                        <option value="normal">Normale</option><option value="medium">Medium</option><option value="semibold">Semibold</option><option value="bold">Bold</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Peso testo</label>
                      <select value={settings.comunicazione.pesoTesto} onChange={(e) => update('comunicazione', { pesoTesto: e.target.value })} className="w-full border border-border rounded px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-gray-900">
                        <option value="normal">Normale</option><option value="medium">Medium</option><option value="semibold">Semibold</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Trasformazione testo</label>
                    <select value={settings.comunicazione.trasformazione} onChange={(e) => update('comunicazione', { trasformazione: e.target.value })} className="w-full border border-border rounded px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-gray-900">
                      <option value="none">Nessuna</option><option value="uppercase">MAIUSCOLO</option><option value="lowercase">minuscolo</option><option value="capitalize">Prima Lettera</option>
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
                <div className="space-y-3">
                  <p className="text-2xs font-semibold uppercase tracking-widest text-gray-400">Stile box</p>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Sfondo</label>
                    <ColorPickerWithPalette value={settings.comunicazione.sfondo} onChange={(v) => update('comunicazione', { sfondo: v })} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Bordo</label>
                      <select value={settings.comunicazione.bordo} onChange={(e) => update('comunicazione', { bordo: e.target.value })} className="w-full border border-border rounded px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-gray-900">
                        <option value="none">Nessuno</option><option value="thin">Sottile (1px)</option><option value="medium">Medio (2px)</option><option value="thick">Spesso (3px)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Raggio (px)</label>
                      <input type="number" min={0} max={40} value={settings.comunicazione.raggio} onChange={(e) => update('comunicazione', { raggio: Number(e.target.value) })} className="w-full border border-border rounded px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-gray-900" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Ombra</label>
                      <select value={settings.comunicazione.ombra} onChange={(e) => update('comunicazione', { ombra: e.target.value })} className="w-full border border-border rounded px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-gray-900">
                        <option value="none">Nessuna</option><option value="sm">Leggera</option><option value="md">Media</option><option value="lg">Forte</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Padding (px)</label>
                      <input type="number" min={8} max={48} value={settings.comunicazione.padding} onChange={(e) => update('comunicazione', { padding: Number(e.target.value) })} className="w-full border border-border rounded px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-gray-900" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Colore bordo</label>
                    <ColorPickerWithPalette value={settings.comunicazione.coloreBordo} onChange={(v) => update('comunicazione', { coloreBordo: v })} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Larghezza</label>
                    <select value={settings.comunicazione.larghezza} onChange={(e) => update('comunicazione', { larghezza: e.target.value })} className="w-full border border-border rounded px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-gray-900">
                      <option value="full">Piena larghezza</option><option value="lg">Larga (640px)</option><option value="md">Media (480px)</option><option value="sm">Stretta (320px)</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-3">
                  <p className="text-2xs font-semibold uppercase tracking-widest text-gray-400">Icona / Emoji</p>
                  <ToggleRow label="Mostra icona" checked={settings.comunicazione.mostraIcona} onChange={(v) => update('comunicazione', { mostraIcona: v })} />
                  {settings.comunicazione.mostraIcona && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Emoji</label>
                        <input type="text" value={settings.comunicazione.icona} onChange={(e) => update('comunicazione', { icona: e.target.value })} className="w-full border border-border rounded px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-gray-900" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Posizione icona</label>
                        <select value={settings.comunicazione.posizioneIcona} onChange={(e) => update('comunicazione', { posizioneIcona: e.target.value })} className="w-full border border-border rounded px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-gray-900">
                          <option value="before">Prima del titolo</option><option value="after">Dopo il titolo</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
                <div className="space-y-3">
                  <p className="text-2xs font-semibold uppercase tracking-widest text-gray-400">Comportamento</p>
                  <ToggleRow label="Chiudibile dall'utente" checked={settings.comunicazione.chiudibile} onChange={(v) => update('comunicazione', { chiudibile: v })} />
                  <ToggleRow label="Mostra solo una volta (per sessione)" checked={settings.comunicazione.soloUnaVolta} onChange={(v) => update('comunicazione', { soloUnaVolta: v })} />
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Scadenza (lascia vuoto per nessuna)</label>
                    <input type="date" value={settings.comunicazione.scadenza} onChange={(e) => update('comunicazione', { scadenza: e.target.value })} className="w-full border border-border rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-gray-900" />
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-2xs font-semibold uppercase tracking-widest text-gray-400">Anteprima</p>
                  <ComunicazionePreview cs={settings.comunicazione} />
                </div>
              </div>
            )}
            <SaveButton onClick={() => saveSection(comunicazioneKeys, 'Comunicazione')} loading={saving === 'Comunicazione'} />
          </SectionCard>

          {/* Secondo messaggio */}
          <SectionCard title="Secondo messaggio homepage">
            <p className="text-xs text-gray-400">Un secondo messaggio indipendente, con posizione e stile propri.</p>
            <ToggleRow label="Mostra secondo messaggio" checked={settings.comunicazione2.attivo} onChange={(v) => update('comunicazione2', { attivo: v })} />
            {settings.comunicazione2.attivo && (
              <div className="space-y-5">
                <div className="space-y-3">
                  <p className="text-2xs font-semibold uppercase tracking-widest text-gray-400">Contenuto</p>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Titolo</label>
                    <input type="text" value={settings.comunicazione2.titolo} onChange={(e) => update('comunicazione2', { titolo: e.target.value })} placeholder="Es. Offerta speciale" className="w-full border border-border rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-gray-900" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Testo</label>
                    <textarea value={settings.comunicazione2.testo} onChange={(e) => update('comunicazione2', { testo: e.target.value })} placeholder="Testo del secondo messaggio…" rows={3} className="w-full border border-border rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-gray-900 resize-none" />
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-2xs font-semibold uppercase tracking-widest text-gray-400">Posizione nella homepage</p>
                  <select value={settings.comunicazione2.posizione} onChange={(e) => update('comunicazione2', { posizione: e.target.value })} className="w-full border border-border rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-gray-900">
                    <option value="top">In cima (sopra l&apos;immagine hero)</option>
                    <option value="after-cta">Dopo il tasto CTA</option>
                    <option value="after-products">Dopo la griglia prodotti</option>
                    <option value="bottom">In fondo alla pagina</option>
                    <option value="banner-top">Banner fisso in alto</option>
                    <option value="banner-bottom">Banner fisso in basso</option>
                  </select>
                </div>
                <div className="space-y-3">
                  <p className="text-2xs font-semibold uppercase tracking-widest text-gray-400">Stile testo</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Font</label>
                      <select value={settings.comunicazione2.font} onChange={(e) => update('comunicazione2', { font: e.target.value })} className="w-full border border-border rounded px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-gray-900">
                        <option value="system">Sistema</option><option value="serif">Serif</option><option value="mono">Mono</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Allineamento</label>
                      <select value={settings.comunicazione2.allineamento} onChange={(e) => update('comunicazione2', { allineamento: e.target.value })} className="w-full border border-border rounded px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-gray-900">
                        <option value="left">Sinistra</option><option value="center">Centro</option><option value="right">Destra</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Dim. titolo (px)</label>
                      <input type="number" min={10} max={40} value={settings.comunicazione2.fontSizeTitolo} onChange={(e) => update('comunicazione2', { fontSizeTitolo: Number(e.target.value) })} className="w-full border border-border rounded px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-gray-900" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Dim. testo (px)</label>
                      <input type="number" min={10} max={30} value={settings.comunicazione2.fontSizeTesto} onChange={(e) => update('comunicazione2', { fontSizeTesto: Number(e.target.value) })} className="w-full border border-border rounded px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-gray-900" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Peso titolo</label>
                      <select value={settings.comunicazione2.pesoTitolo} onChange={(e) => update('comunicazione2', { pesoTitolo: e.target.value })} className="w-full border border-border rounded px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-gray-900">
                        <option value="normal">Normale</option><option value="medium">Medium</option><option value="semibold">Semibold</option><option value="bold">Bold</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Peso testo</label>
                      <select value={settings.comunicazione2.pesoTesto} onChange={(e) => update('comunicazione2', { pesoTesto: e.target.value })} className="w-full border border-border rounded px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-gray-900">
                        <option value="normal">Normale</option><option value="medium">Medium</option><option value="semibold">Semibold</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Trasformazione testo</label>
                    <select value={settings.comunicazione2.trasformazione} onChange={(e) => update('comunicazione2', { trasformazione: e.target.value })} className="w-full border border-border rounded px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-gray-900">
                      <option value="none">Nessuna</option><option value="uppercase">MAIUSCOLO</option><option value="lowercase">minuscolo</option><option value="capitalize">Prima Lettera</option>
                    </select>
                  </div>
                  <div className="flex gap-4">
                    <ToggleRow label="Titolo corsivo" checked={settings.comunicazione2.corsivoTitolo} onChange={(v) => update('comunicazione2', { corsivoTitolo: v })} />
                    <ToggleRow label="Testo corsivo" checked={settings.comunicazione2.corsivoTesto} onChange={(v) => update('comunicazione2', { corsivoTesto: v })} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Colore titolo</label>
                    <ColorPickerWithPalette value={settings.comunicazione2.coloreTitolo} onChange={(v) => update('comunicazione2', { coloreTitolo: v })} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Colore testo</label>
                    <ColorPickerWithPalette value={settings.comunicazione2.coloreTesto} onChange={(v) => update('comunicazione2', { coloreTesto: v })} />
                  </div>
                </div>
                <div className="space-y-3">
                  <p className="text-2xs font-semibold uppercase tracking-widest text-gray-400">Stile box</p>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Sfondo</label>
                    <ColorPickerWithPalette value={settings.comunicazione2.sfondo} onChange={(v) => update('comunicazione2', { sfondo: v })} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Bordo</label>
                      <select value={settings.comunicazione2.bordo} onChange={(e) => update('comunicazione2', { bordo: e.target.value })} className="w-full border border-border rounded px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-gray-900">
                        <option value="none">Nessuno</option><option value="thin">Sottile (1px)</option><option value="medium">Medio (2px)</option><option value="thick">Spesso (3px)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Raggio (px)</label>
                      <input type="number" min={0} max={40} value={settings.comunicazione2.raggio} onChange={(e) => update('comunicazione2', { raggio: Number(e.target.value) })} className="w-full border border-border rounded px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-gray-900" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Ombra</label>
                      <select value={settings.comunicazione2.ombra} onChange={(e) => update('comunicazione2', { ombra: e.target.value })} className="w-full border border-border rounded px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-gray-900">
                        <option value="none">Nessuna</option><option value="sm">Leggera</option><option value="md">Media</option><option value="lg">Forte</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Padding (px)</label>
                      <input type="number" min={8} max={48} value={settings.comunicazione2.padding} onChange={(e) => update('comunicazione2', { padding: Number(e.target.value) })} className="w-full border border-border rounded px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-gray-900" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Colore bordo</label>
                    <ColorPickerWithPalette value={settings.comunicazione2.coloreBordo} onChange={(v) => update('comunicazione2', { coloreBordo: v })} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Larghezza</label>
                    <select value={settings.comunicazione2.larghezza} onChange={(e) => update('comunicazione2', { larghezza: e.target.value })} className="w-full border border-border rounded px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-gray-900">
                      <option value="full">Piena larghezza</option><option value="lg">Larga (640px)</option><option value="md">Media (480px)</option><option value="sm">Stretta (320px)</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-3">
                  <p className="text-2xs font-semibold uppercase tracking-widest text-gray-400">Icona / Emoji</p>
                  <ToggleRow label="Mostra icona" checked={settings.comunicazione2.mostraIcona} onChange={(v) => update('comunicazione2', { mostraIcona: v })} />
                  {settings.comunicazione2.mostraIcona && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Emoji</label>
                        <input type="text" value={settings.comunicazione2.icona} onChange={(e) => update('comunicazione2', { icona: e.target.value })} className="w-full border border-border rounded px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-gray-900" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Posizione icona</label>
                        <select value={settings.comunicazione2.posizioneIcona} onChange={(e) => update('comunicazione2', { posizioneIcona: e.target.value })} className="w-full border border-border rounded px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-gray-900">
                          <option value="before">Prima del titolo</option><option value="after">Dopo il titolo</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
                <div className="space-y-3">
                  <p className="text-2xs font-semibold uppercase tracking-widest text-gray-400">Comportamento</p>
                  <ToggleRow label="Chiudibile dall'utente" checked={settings.comunicazione2.chiudibile} onChange={(v) => update('comunicazione2', { chiudibile: v })} />
                  <ToggleRow label="Mostra solo una volta (per sessione)" checked={settings.comunicazione2.soloUnaVolta} onChange={(v) => update('comunicazione2', { soloUnaVolta: v })} />
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Scadenza (lascia vuoto per nessuna)</label>
                    <input type="date" value={settings.comunicazione2.scadenza} onChange={(e) => update('comunicazione2', { scadenza: e.target.value })} className="w-full border border-border rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-gray-900" />
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-2xs font-semibold uppercase tracking-widest text-gray-400">Anteprima</p>
                  <ComunicazionePreview cs={settings.comunicazione2} />
                </div>
              </div>
            )}
            <SaveButton onClick={() => saveSection(comunicazione2Keys, 'Comunicazione2')} loading={saving === 'Comunicazione2'} />
          </SectionCard>

        </div>
      </div>

      {/* ── Collezioni ─────────────────────────────────────────── */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-3">Collezioni</p>

        {/* Tab switcher */}
        <div className="flex border-b border-border mb-4">
          {(['casa', 'moda'] as const).map(col => (
            <button
              key={col}
              type="button"
              onClick={() => setActiveCollection(col)}
              className={`px-4 py-2.5 text-xs font-medium transition-colors border-b-2 -mb-px ${
                activeCollection === col ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              {col === 'casa' ? 'Casa 2027' : 'Moda'}
            </button>
          ))}
        </div>

        {activeCollection === 'casa' ? (
          <CollectionPanel
            data={casaData}
            onChange={onCasaChange}
            saving={saving}
            savingFiltri={savingCasaFiltri}
            savingPrefix="casa"
            onSaveMenu={() => saveSection(casaMenuKeys, 'casa-Menu')}
            onSaveScheda={() => saveSection(casaSchedaKeys, 'casa-Scheda')}
            onSaveCard={() => saveSection(casaCardKeys, 'casa-Card')}
            onSaveOrdine={() => saveSection(casaOrdineKeys, 'casa-Ordine')}
            onSaveFiltri={saveCasaFiltri}
            sensors={sensors}
          />
        ) : (
          <CollectionPanel
            data={modaData}
            onChange={patch => setModaData(prev => ({ ...prev, ...patch }))}
            saving={saving}
            savingFiltri={savingModaFiltri}
            savingPrefix="moda"
            onSaveMenu={() => saveModaSection(modaMenuKeys, 'moda-Menu')}
            onSaveScheda={() => saveModaSection(modaSchedaKeys, 'moda-Scheda')}
            onSaveCard={() => saveModaSection(modaCardKeys, 'moda-Card')}
            onSaveOrdine={() => saveModaSection(modaOrdineKeys, 'moda-Ordine')}
            onSaveFiltri={saveModaFiltri}
            sensors={sensors}
          />
        )}
      </div>
    </div>
  );
}
