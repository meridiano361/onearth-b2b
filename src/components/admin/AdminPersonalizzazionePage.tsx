'use client';

import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { GripVertical, ImageIcon, ChevronDown, Plus, Trash2 } from 'lucide-react';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { parseSettingsFromDb, DEFAULT_APP_SETTINGS } from '@/contexts/SettingsContext';
import type { AppSettingsData } from '@/contexts/SettingsContext';
import { SOCIAL_KEYS } from '@/lib/settingsHelpers';

// ─── Types ────────────────────────────────────────────────────────────────────

type SettingsFlat = Record<string, string>;

type CollezioneItem = {
  id: string;
  titolo: string;
  sottotitolo: string;
  fotoUrl: string;
  dataInizio: string;
  dataScadenza: string;
  dataFine: string;
  scrollAttivo: boolean;
};

// ─── settingsToFlat ──────────────────────────────────────────────────────────

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
  f['login.claim'] = s.login.claim;
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

// ─── UI helpers ───────────────────────────────────────────────────────────────

function SectionCard({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white border border-border rounded-xl overflow-hidden">
      <button type="button" onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors">
        <h2 className="text-xs font-semibold text-gray-600">{title}</h2>
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
      <button type="button" onClick={() => onChange(!checked)} className={`relative w-10 h-5 rounded-full transition-colors ${checked ? 'bg-gray-900' : 'bg-gray-300'}`}>
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
      </button>
    </label>
  );
}

function SaveButton({ onClick, loading }: { onClick: () => void; loading: boolean }) {
  return (
    <div className="flex justify-end pt-2">
      <button onClick={onClick} disabled={loading} className="px-4 py-2 bg-gray-900 text-white text-xs font-medium rounded hover:bg-gray-700 disabled:opacity-50 transition-colors">
        {loading ? 'Salvataggio…' : 'Salva'}
      </button>
    </div>
  );
}

function ColorPickerWithPalette({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const palette = ['#FFFFFF','#F5F0EA','#FFFBEB','#F3F4F6','#111827','#374151','#6B7280','#C17A5A','#B45309','#DC2626','#2563EB','#059669','#7C3AED'];
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {palette.map(c => (
          <button key={c} type="button" onClick={() => onChange(c)} title={c}
            className="w-6 h-6 rounded border border-border transition-transform hover:scale-110"
            style={{ backgroundColor: c, outline: value === c ? '2px solid #111827' : undefined, outlineOffset: '2px' }} />
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input type="color" value={value} onChange={e => onChange(e.target.value)} className="w-8 h-8 rounded border border-border cursor-pointer flex-shrink-0" />
        <input type="text" value={value} onChange={e => onChange(e.target.value)} className="flex-1 border border-border rounded px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-gray-900 font-mono" />
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
  const titleEl = cs.titolo ? <p style={{ fontSize: cs.fontSizeTitolo, fontWeight: cs.pesoTitolo, fontStyle: cs.corsivoTitolo ? 'italic' : undefined, textTransform: cs.trasformazione as React.CSSProperties['textTransform'], color: cs.coloreTitolo, margin: 0, fontFamily }}>{cs.titolo}</p> : null;
  const textEl = cs.testo ? <p style={{ fontSize: cs.fontSizeTesto, fontWeight: cs.pesoTesto, fontStyle: cs.corsivoTesto ? 'italic' : undefined, color: cs.coloreTesto, margin: 0, fontFamily }}>{cs.testo}</p> : null;
  const icon = cs.mostraIcona && cs.icona ? <span style={{ fontSize: cs.fontSizeTitolo + 2 }}>{cs.icona}</span> : null;
  return (
    <div style={{ maxWidth }}>
      <div style={{ backgroundColor: cs.sfondo, borderRadius: cs.raggio, borderWidth, borderStyle: borderWidth > 0 ? 'solid' : undefined, borderColor: cs.coloreBordo, padding: cs.padding, boxShadow, textAlign }}>
        {cs.posizioneIcona === 'before' ? (
          <div style={{ display: 'flex', flexDirection: cs.allineamento === 'center' ? 'column' : 'row', alignItems: cs.allineamento === 'center' ? 'center' : 'flex-start', gap: 8 }}>
            {icon}<div style={{ flex: 1 }}>{titleEl}{titleEl && textEl && <div style={{ height: 4 }} />}{textEl}</div>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', justifyContent: cs.allineamento === 'right' ? 'flex-end' : cs.allineamento === 'center' ? 'center' : 'flex-start', gap: 8 }}>{titleEl}{icon}</div>
            {titleEl && textEl && <div style={{ height: 4 }} />}{textEl}
          </div>
        )}
        {cs.chiudibile && <div style={{ textAlign: 'right', marginTop: 8 }}><span style={{ fontSize: 11, color: cs.coloreTesto, opacity: 0.5, cursor: 'pointer' }}>✕ chiudi</span></div>}
      </div>
    </div>
  );
}

interface MenuItemDef { key: string; label: string; visibile: boolean; }
function SortableMenuItem({ item, onChange }: { item: MenuItemDef; onChange: (key: string, field: 'label' | 'visibile', value: string | boolean) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.key });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-3 bg-gray-50 border border-border rounded-lg px-3 py-2.5">
      <button {...attributes} {...listeners} type="button" className="cursor-grab text-gray-400 hover:text-gray-600"><GripVertical size={14} /></button>
      <input type="text" value={item.label} onChange={e => onChange(item.key, 'label', e.target.value)} className="flex-1 text-sm bg-white border border-border rounded px-2 py-1 outline-none focus:ring-1 focus:ring-gray-900 text-primary" />
      <button type="button" onClick={() => onChange(item.key, 'visibile', !item.visibile)} className={`relative w-9 h-[18px] rounded-full transition-colors flex-shrink-0 ${item.visibile ? 'bg-gray-900' : 'bg-gray-300'}`}>
        <span className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-transform ${item.visibile ? 'translate-x-[18px]' : ''}`} />
      </button>
    </div>
  );
}

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
          <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder="https://..." className="w-full border border-border rounded px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-gray-900 text-gray-600" />
          <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="px-3 py-1.5 bg-gray-100 text-xs font-medium rounded hover:bg-gray-200 disabled:opacity-50 transition-colors">
            {uploading ? 'Caricamento…' : 'Carica immagine'}
          </button>
          <input ref={fileRef as React.RefObject<HTMLInputElement>} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }} />
        </div>
      </div>
    </div>
  );
}

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
      <input type="url" value={item.url} onChange={e => onChange(item.key, 'url', e.target.value)} placeholder="https://..." className="w-full border border-border rounded px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-gray-900 text-gray-600 ml-5" />
    </div>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────

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
  { key: 'conferente',         label: 'Conferente' },
];

// ─── ComunicazioneEditor ──────────────────────────────────────────────────────

type ComunicazioneData = AppSettingsData['comunicazione'];

function ComunicazioneEditor({ label, cs, onUpdate, saving, onSave }: {
  label: string;
  cs: ComunicazioneData;
  onUpdate: (patch: Partial<ComunicazioneData>) => void;
  saving: boolean;
  onSave: () => void;
}) {
  const [open, setOpen] = useState(false);
  const sel = 'w-full border border-border rounded px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-gray-900';
  return (
    <div className="border border-border rounded-lg overflow-hidden bg-white">
      <button type="button" onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700">{label}</span>
          <span className={`text-2xs px-2 py-0.5 rounded-full ${cs.attivo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
            {cs.attivo ? 'Attivo' : 'Inattivo'}
          </span>
        </div>
        <ChevronDown size={14} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-4 pb-4 pt-3 border-t border-border space-y-5">
          <ToggleRow label="Mostra messaggio" checked={cs.attivo} onChange={v => onUpdate({ attivo: v })} />
          {cs.attivo && (<>
            <div className="space-y-3">
              <p className="text-2xs font-semibold text-gray-400">Contenuto</p>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Titolo</label>
                <input type="text" value={cs.titolo} onChange={e => onUpdate({ titolo: e.target.value })} placeholder="Es. Novità in catalogo" className="w-full border border-border rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-gray-900" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Testo</label>
                <textarea value={cs.testo} onChange={e => onUpdate({ testo: e.target.value })} rows={3} className="w-full border border-border rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-gray-900 resize-none" />
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-2xs font-semibold text-gray-400">Posizione nella homepage</p>
              <select value={cs.posizione} onChange={e => onUpdate({ posizione: e.target.value })} className={sel}>
                <option value="top">In cima (sopra l&apos;immagine hero)</option>
                <option value="after-cta">Dopo il tasto CTA</option>
                <option value="after-products">Dopo la griglia prodotti</option>
                <option value="bottom">In fondo alla pagina</option>
                <option value="banner-top">Banner fisso in alto</option>
                <option value="banner-bottom">Banner fisso in basso</option>
              </select>
            </div>
            <div className="space-y-3">
              <p className="text-2xs font-semibold text-gray-400">Stile testo</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Font</label>
                  <select value={cs.font} onChange={e => onUpdate({ font: e.target.value })} className={sel}>
                    <option value="system">Sistema</option><option value="serif">Serif</option><option value="mono">Mono</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Allineamento</label>
                  <select value={cs.allineamento} onChange={e => onUpdate({ allineamento: e.target.value })} className={sel}>
                    <option value="left">Sinistra</option><option value="center">Centro</option><option value="right">Destra</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Dim. titolo (px)</label>
                  <input type="number" min={10} max={40} value={cs.fontSizeTitolo} onChange={e => onUpdate({ fontSizeTitolo: Number(e.target.value) })} className={sel} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Dim. testo (px)</label>
                  <input type="number" min={10} max={30} value={cs.fontSizeTesto} onChange={e => onUpdate({ fontSizeTesto: Number(e.target.value) })} className={sel} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Peso titolo</label>
                  <select value={cs.pesoTitolo} onChange={e => onUpdate({ pesoTitolo: e.target.value })} className={sel}>
                    <option value="normal">Normale</option><option value="medium">Medium</option><option value="semibold">Semibold</option><option value="bold">Bold</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Peso testo</label>
                  <select value={cs.pesoTesto} onChange={e => onUpdate({ pesoTesto: e.target.value })} className={sel}>
                    <option value="normal">Normale</option><option value="medium">Medium</option><option value="semibold">Semibold</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Trasformazione</label>
                <select value={cs.trasformazione} onChange={e => onUpdate({ trasformazione: e.target.value })} className={sel}>
                  <option value="none">Nessuna</option><option value="uppercase">MAIUSCOLO</option><option value="lowercase">minuscolo</option><option value="capitalize">Prima Lettera</option>
                </select>
              </div>
              <div className="flex gap-4">
                <ToggleRow label="Titolo corsivo" checked={cs.corsivoTitolo} onChange={v => onUpdate({ corsivoTitolo: v })} />
                <ToggleRow label="Testo corsivo" checked={cs.corsivoTesto} onChange={v => onUpdate({ corsivoTesto: v })} />
              </div>
              <div><label className="text-xs text-gray-500 mb-1 block">Colore titolo</label><ColorPickerWithPalette value={cs.coloreTitolo} onChange={v => onUpdate({ coloreTitolo: v })} /></div>
              <div><label className="text-xs text-gray-500 mb-1 block">Colore testo</label><ColorPickerWithPalette value={cs.coloreTesto} onChange={v => onUpdate({ coloreTesto: v })} /></div>
            </div>
            <div className="space-y-3">
              <p className="text-2xs font-semibold text-gray-400">Stile box</p>
              <div><label className="text-xs text-gray-500 mb-1 block">Sfondo</label><ColorPickerWithPalette value={cs.sfondo} onChange={v => onUpdate({ sfondo: v })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Bordo</label>
                  <select value={cs.bordo} onChange={e => onUpdate({ bordo: e.target.value })} className={sel}>
                    <option value="none">Nessuno</option><option value="thin">Sottile (1px)</option><option value="medium">Medio (2px)</option><option value="thick">Spesso (3px)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Raggio (px)</label>
                  <input type="number" min={0} max={40} value={cs.raggio} onChange={e => onUpdate({ raggio: Number(e.target.value) })} className={sel} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Ombra</label>
                  <select value={cs.ombra} onChange={e => onUpdate({ ombra: e.target.value })} className={sel}>
                    <option value="none">Nessuna</option><option value="sm">Leggera</option><option value="md">Media</option><option value="lg">Forte</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Padding (px)</label>
                  <input type="number" min={8} max={48} value={cs.padding} onChange={e => onUpdate({ padding: Number(e.target.value) })} className={sel} />
                </div>
              </div>
              <div><label className="text-xs text-gray-500 mb-1 block">Colore bordo</label><ColorPickerWithPalette value={cs.coloreBordo} onChange={v => onUpdate({ coloreBordo: v })} /></div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Larghezza</label>
                <select value={cs.larghezza} onChange={e => onUpdate({ larghezza: e.target.value })} className={sel}>
                  <option value="full">Piena larghezza</option><option value="lg">Larga (640px)</option><option value="md">Media (480px)</option><option value="sm">Stretta (320px)</option>
                </select>
              </div>
            </div>
            <div className="space-y-3">
              <p className="text-2xs font-semibold text-gray-400">Icona / Emoji</p>
              <ToggleRow label="Mostra icona" checked={cs.mostraIcona} onChange={v => onUpdate({ mostraIcona: v })} />
              {cs.mostraIcona && (
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs text-gray-500 mb-1 block">Emoji</label><input type="text" value={cs.icona} onChange={e => onUpdate({ icona: e.target.value })} className={sel} /></div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Posizione</label>
                    <select value={cs.posizioneIcona} onChange={e => onUpdate({ posizioneIcona: e.target.value })} className={sel}>
                      <option value="before">Prima del titolo</option><option value="after">Dopo il titolo</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-3">
              <p className="text-2xs font-semibold text-gray-400">Comportamento</p>
              <ToggleRow label="Chiudibile dall'utente" checked={cs.chiudibile} onChange={v => onUpdate({ chiudibile: v })} />
              <ToggleRow label="Mostra solo una volta (per sessione)" checked={cs.soloUnaVolta} onChange={v => onUpdate({ soloUnaVolta: v })} />
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Scadenza (lascia vuoto per nessuna)</label>
                <input type="date" value={cs.scadenza} onChange={e => onUpdate({ scadenza: e.target.value })} className="w-full border border-border rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-gray-900" />
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-2xs font-semibold text-gray-400">Anteprima</p>
              <ComunicazionePreview cs={cs} />
            </div>
          </>)}
          <SaveButton onClick={onSave} loading={saving} />
        </div>
      )}
    </div>
  );
}

// ─── CollezioneCard ───────────────────────────────────────────────────────────

function CollezioneCard({ item, onChange, onDelete }: {
  item: CollezioneItem;
  onChange: (patch: Partial<CollezioneItem>) => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const inp = 'w-full border border-border rounded px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-gray-900';
  return (
    <div className="border border-border rounded-lg overflow-hidden bg-white">
      <div className="flex items-center px-4 py-3">
        <button type="button" onClick={() => setOpen(o => !o)} className="flex-1 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">{item.titolo || 'Nuova collezione'}</span>
          <ChevronDown size={14} className={`text-gray-400 transition-transform mr-3 ${open ? 'rotate-180' : ''}`} />
        </button>
        <button type="button" onClick={onDelete} className="p-1.5 text-gray-300 hover:text-red-500 transition-colors" title="Elimina collezione">
          <Trash2 size={13} />
        </button>
      </div>
      {open && (
        <div className="px-4 pb-4 pt-3 border-t border-border space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">ID / slug</label>
              <input type="text" value={item.id} onChange={e => onChange({ id: e.target.value })} placeholder="es. casa27" className={`${inp} font-mono text-xs`} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Titolo collezione</label>
              <input type="text" value={item.titolo} onChange={e => onChange({ titolo: e.target.value })} placeholder="es. Casa 2027" className={inp} />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Sottotitolo</label>
            <input type="text" value={item.sottotitolo} onChange={e => onChange({ sottotitolo: e.target.value })} className={inp} />
          </div>
          <ImageUploadInput label="Foto principale" value={item.fotoUrl} onChange={url => onChange({ fotoUrl: url })} />
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Data inizio</label>
              <input type="date" value={item.dataInizio} onChange={e => onChange({ dataInizio: e.target.value })} className={inp} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Scadenza prenotazioni</label>
              <input type="date" value={item.dataScadenza} onChange={e => onChange({ dataScadenza: e.target.value })} className={inp} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Data fine</label>
              <input type="date" value={item.dataFine} onChange={e => onChange({ dataFine: e.target.value })} className={inp} />
            </div>
          </div>
          <ToggleRow label="Mostra scroll prodotti" checked={item.scrollAttivo} onChange={v => onChange({ scrollAttivo: v })} />
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AdminPersonalizzazionePage() {
  const [settings, setSettings] = useState<AppSettingsData>(DEFAULT_APP_SETTINGS);
  const [saving, setSaving] = useState<string | null>(null);
  const [filtriVisibili, setFiltriVisibili] = useState<string[]>([]);
  const [savingFiltri, setSavingFiltri] = useState(false);
  const [collezioni, setCollezioni] = useState<CollezioneItem[]>([]);
  const [savingCollezioni, setSavingCollezioni] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const { isLoading } = useQuery({
    queryKey: ['admin-personalizzazione'],
    queryFn: async () => {
      const [flat, filtriData] = await Promise.all([
        fetch('/api/settings/public').then(r => r.json()) as Promise<Record<string, string>>,
        fetch('/api/admin/catalog-settings').then(r => r.json()).catch(() => ({})),
      ]);

      const records = Object.entries(flat)
        .filter(([k]) => !k.startsWith('moda.'))
        .map(([chiave, valore]) => ({ chiave, valore }));
      const parsed = parseSettingsFromDb(records);
      setSettings(parsed);

      if (Array.isArray(filtriData.filtriVisibili)) setFiltriVisibili(filtriData.filtriVisibili);

      let colList: CollezioneItem[] = [];
      try {
        const raw = flat['collections.lista'];
        if (raw) colList = JSON.parse(raw);
      } catch { /* ignore */ }
      if (colList.length === 0) {
        colList = [
          { id: 'casa', titolo: 'Casa 2027', sottotitolo: '', fotoUrl: '', dataInizio: '', dataScadenza: flat['collection.casa.bookingDeadline'] ?? '', dataFine: '', scrollAttivo: true },
          { id: 'moda', titolo: 'Moda PE27', sottotitolo: '', fotoUrl: '', dataInizio: '', dataScadenza: flat['collection.moda.bookingDeadline'] ?? '', dataFine: '', scrollAttivo: true },
        ];
      }
      setCollezioni(colList);

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
      toast.success(`${label} salvato`);
    } catch { toast.error('Errore nel salvataggio'); }
    finally { setSaving(null); }
  }

  async function saveFiltri() {
    setSavingFiltri(true);
    try {
      const res = await fetch('/api/admin/catalog-settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ filtriVisibili }) });
      if (!res.ok) throw new Error();
      toast.success('Filtri salvati');
    } catch { toast.error('Errore nel salvataggio'); }
    finally { setSavingFiltri(false); }
  }

  async function saveCollezioni() {
    setSavingCollezioni(true);
    const body: Record<string, string> = { 'collections.lista': JSON.stringify(collezioni) };
    for (const col of collezioni) {
      body[`collection.${col.id}.bookingDeadline`] = col.dataScadenza;
    }
    try {
      const res = await fetch('/api/admin/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error();
      toast.success('Collezioni salvate');
    } catch { toast.error('Errore nel salvataggio'); }
    finally { setSavingCollezioni(false); }
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

  function handleMenuDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = settings.menu.ordine.indexOf(String(active.id));
    const newIndex = settings.menu.ordine.indexOf(String(over.id));
    update('menu', { ordine: arrayMove(settings.menu.ordine, oldIndex, newIndex) });
  }

  function handleMenuItemChange(key: string, field: 'label' | 'visibile', value: string | boolean) {
    update('menu', { items: { ...settings.menu.items, [key]: { ...settings.menu.items[key], [field]: value } } });
  }

  // Save key arrays
  const homeKeys = ['home.titolo1','home.titolo1.maiuscolo','home.titolo1.colore','home.titolo1.size','home.titolo1.font','home.titolo1.weight','home.titolo1.lineHeight','home.titolo1.letterSpacing','home.titolo1.transform','home.titolo2','home.titolo2.colore','home.titolo2.size','home.titolo2.font','home.titolo2.weight','home.titolo2.lineHeight','home.titolo2.letterSpacing','home.titolo2.transform','home.cta','home.scrollAttivo','home.scrollNumero','home.scrollCollezione','home.editorialAttivo','home.editorialUrl','home.editorialCaption'];
  const loginKeys = ['login.sfondoUrl', 'login.caption', 'login.claim'];
  const coloriKeys = ['colori.sfondo', 'colori.pulsanti', 'colori.testoPulsanti', 'colori.testo'];
  const socialKeys = ['social.ordine', ...SOCIAL_KEYS.flatMap(k => [`social.${k}.visibile`, `social.${k}.url`])];
  const comunicazioneKeys = ['comunicazione.attivo','comunicazione.titolo','comunicazione.testo','comunicazione.colore','comunicazione.posizione','comunicazione.font','comunicazione.fontSizeTitolo','comunicazione.fontSizeTesto','comunicazione.pesoTitolo','comunicazione.pesoTesto','comunicazione.allineamento','comunicazione.trasformazione','comunicazione.corsivoTitolo','comunicazione.corsivoTesto','comunicazione.sfondo','comunicazione.coloreTesto','comunicazione.coloreTitolo','comunicazione.bordo','comunicazione.coloreBordo','comunicazione.raggio','comunicazione.ombra','comunicazione.padding','comunicazione.larghezza','comunicazione.mostraIcona','comunicazione.icona','comunicazione.posizioneIcona','comunicazione.chiudibile','comunicazione.soloUnaVolta','comunicazione.scadenza'];
  const comunicazione2Keys = ['comunicazione2.attivo','comunicazione2.titolo','comunicazione2.testo','comunicazione2.colore','comunicazione2.posizione','comunicazione2.font','comunicazione2.fontSizeTitolo','comunicazione2.fontSizeTesto','comunicazione2.pesoTitolo','comunicazione2.pesoTesto','comunicazione2.allineamento','comunicazione2.trasformazione','comunicazione2.corsivoTitolo','comunicazione2.corsivoTesto','comunicazione2.sfondo','comunicazione2.coloreTesto','comunicazione2.coloreTitolo','comunicazione2.bordo','comunicazione2.coloreBordo','comunicazione2.raggio','comunicazione2.ombra','comunicazione2.padding','comunicazione2.larghezza','comunicazione2.mostraIcona','comunicazione2.icona','comunicazione2.posizioneIcona','comunicazione2.chiudibile','comunicazione2.soloUnaVolta','comunicazione2.scadenza'];
  const menuKeys = ['menu.ordine', ...settings.menu.ordine.flatMap(k => [`menu.${k}.label`, `menu.${k}.visibile`])];
  const schedaKeys = Object.keys(settings.scheda).map(k => `scheda.${k}`);
  const cardKeys = Object.keys(settings.card).map(k => `card.${k}`);
  const ordineKeys = Object.keys(settings.ordine).map(k => `ordine.${k}`);

  const inp = 'w-full border border-border rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-gray-900';

  if (isLoading) return <div className="p-8 text-sm text-gray-400">Caricamento impostazioni…</div>;

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-8">
      <h1 className="text-lg font-semibold text-primary">Personalizzazione</h1>

      {/* ── Impostazioni generali ─────────────────────────────── */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-3">Impostazioni generali</p>
        <div className="space-y-3">

          {/* Pagina di accesso */}
          <SectionCard title="Pagina di accesso">
            <p className="text-2xs font-semibold uppercase tracking-widest text-gray-400 mb-1">Colonna sinistra (desktop)</p>
            <ImageUploadInput label="Immagine di sfondo" value={settings.login.sfondoUrl} onChange={url => update('login', { sfondoUrl: url })} />
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Didascalia in basso</label>
              <input type="text" value={settings.login.caption} onChange={e => update('login', { caption: e.target.value })} className={inp} placeholder="Collezione CASA 2027" />
            </div>
            <div className="h-px bg-border my-2" />
            <p className="text-2xs font-semibold uppercase tracking-widest text-gray-400 mb-1">Colonna destra</p>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Titolo sopra il form di accesso</label>
              <input type="text" value={settings.login.claim} onChange={e => update('login', { claim: e.target.value })} className={inp} placeholder="C'è un mondo da scoprire." />
            </div>
            <SaveButton onClick={() => saveSection(loginKeys, 'Login')} loading={saving === 'Login'} />
          </SectionCard>

          {/* Homepage */}
          <SectionCard title="Homepage">
            <div className="space-y-4">
              {/* Titolo 1 */}
              <div className="space-y-2">
                <p className="text-2xs font-semibold text-gray-400">Titolo 1</p>
                <input type="text" value={settings.home.titolo1} onChange={e => update('home', { titolo1: e.target.value })} className={inp} />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Font</label>
                    <select value={settings.home.titolo1Font} onChange={e => update('home', { titolo1Font: e.target.value })} className="w-full border border-border rounded px-2 py-1.5 text-xs outline-none bg-white">
                      {[['system','System (Nunito)'],['nova','Nova'],['playfair','Playfair Display'],['montserrat','Montserrat'],['lato','Lato'],['georgia','Georgia'],['futura','Futura']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Peso</label>
                    <select value={settings.home.titolo1Weight} onChange={e => update('home', { titolo1Weight: e.target.value })} className="w-full border border-border rounded px-2 py-1.5 text-xs outline-none bg-white">
                      {[['light','Light'],['normal','Normal'],['medium','Medium'],['semibold','Semibold'],['bold','Bold'],['extrabold','Extrabold']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Trasformazione</label>
                    <select value={settings.home.titolo1Transform} onChange={e => update('home', { titolo1Transform: e.target.value })} className="w-full border border-border rounded px-2 py-1.5 text-xs outline-none bg-white">
                      <option value="none">Nessuna</option><option value="uppercase">MAIUSCOLO</option><option value="lowercase">minuscolo</option><option value="capitalize">Prima Lettera</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Colore</label>
                    <div className="flex items-center gap-1.5">
                      <input type="color" value={settings.home.titolo1Colore} onChange={e => update('home', { titolo1Colore: e.target.value })} className="w-8 h-8 rounded border border-border cursor-pointer flex-shrink-0" />
                      <input type="text" value={settings.home.titolo1Colore} onChange={e => update('home', { titolo1Colore: e.target.value })} className="flex-1 border border-border rounded px-2 py-1.5 text-xs outline-none" />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Dimensione (px)</label>
                    <input type="range" min={12} max={60} value={settings.home.titolo1Size} onChange={e => update('home', { titolo1Size: Number(e.target.value) })} className="w-full" />
                    <p className="text-2xs text-gray-400 text-center">{settings.home.titolo1Size}px</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Interlinea</label>
                    <input type="range" min={1} max={2} step={0.05} value={settings.home.titolo1LineHeight} onChange={e => update('home', { titolo1LineHeight: Number(e.target.value) })} className="w-full" />
                    <p className="text-2xs text-gray-400 text-center">{settings.home.titolo1LineHeight.toFixed(2)}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Spaziatura (px)</label>
                    <input type="range" min={-2} max={10} step={0.5} value={settings.home.titolo1LetterSpacing} onChange={e => update('home', { titolo1LetterSpacing: Number(e.target.value) })} className="w-full" />
                    <p className="text-2xs text-gray-400 text-center">{settings.home.titolo1LetterSpacing}px</p>
                  </div>
                </div>
              </div>

              {/* Titolo 2 */}
              <div className="space-y-2 pt-2 border-t border-border">
                <p className="text-2xs font-semibold text-gray-400">Titolo 2</p>
                <input type="text" value={settings.home.titolo2} onChange={e => update('home', { titolo2: e.target.value })} className={inp} />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Font</label>
                    <select value={settings.home.titolo2Font} onChange={e => update('home', { titolo2Font: e.target.value })} className="w-full border border-border rounded px-2 py-1.5 text-xs outline-none bg-white">
                      {[['system','System (Nunito)'],['nova','Nova'],['playfair','Playfair Display'],['montserrat','Montserrat'],['lato','Lato'],['georgia','Georgia'],['futura','Futura']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Peso</label>
                    <select value={settings.home.titolo2Weight} onChange={e => update('home', { titolo2Weight: e.target.value })} className="w-full border border-border rounded px-2 py-1.5 text-xs outline-none bg-white">
                      {[['light','Light'],['normal','Normal'],['medium','Medium'],['semibold','Semibold'],['bold','Bold'],['extrabold','Extrabold']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Trasformazione</label>
                    <select value={settings.home.titolo2Transform} onChange={e => update('home', { titolo2Transform: e.target.value })} className="w-full border border-border rounded px-2 py-1.5 text-xs outline-none bg-white">
                      <option value="none">Nessuna</option><option value="uppercase">MAIUSCOLO</option><option value="lowercase">minuscolo</option><option value="capitalize">Prima Lettera</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Colore</label>
                    <div className="flex items-center gap-1.5">
                      <input type="color" value={settings.home.titolo2Colore} onChange={e => update('home', { titolo2Colore: e.target.value })} className="w-8 h-8 rounded border border-border cursor-pointer flex-shrink-0" />
                      <input type="text" value={settings.home.titolo2Colore} onChange={e => update('home', { titolo2Colore: e.target.value })} className="flex-1 border border-border rounded px-2 py-1.5 text-xs outline-none" />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Dimensione (px)</label>
                    <input type="range" min={12} max={40} value={settings.home.titolo2Size} onChange={e => update('home', { titolo2Size: Number(e.target.value) })} className="w-full" />
                    <p className="text-2xs text-gray-400 text-center">{settings.home.titolo2Size}px</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Interlinea</label>
                    <input type="range" min={1} max={2} step={0.05} value={settings.home.titolo2LineHeight} onChange={e => update('home', { titolo2LineHeight: Number(e.target.value) })} className="w-full" />
                    <p className="text-2xs text-gray-400 text-center">{settings.home.titolo2LineHeight.toFixed(2)}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Spaziatura (px)</label>
                    <input type="range" min={-2} max={10} step={0.5} value={settings.home.titolo2LetterSpacing} onChange={e => update('home', { titolo2LetterSpacing: Number(e.target.value) })} className="w-full" />
                    <p className="text-2xs text-gray-400 text-center">{settings.home.titolo2LetterSpacing}px</p>
                  </div>
                </div>
              </div>

              {/* CTA + scroll */}
              <div className="space-y-3 pt-2 border-t border-border">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Testo CTA</label>
                  <input type="text" value={settings.home.cta} onChange={e => update('home', { cta: e.target.value })} className={inp} />
                </div>
                <ToggleRow label="Mostra scroll prodotti" checked={settings.home.scrollAttivo} onChange={v => update('home', { scrollAttivo: v })} />
                {settings.home.scrollAttivo && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Numero prodotti (3–20)</label>
                      <input type="number" value={settings.home.scrollNumero} onChange={e => update('home', { scrollNumero: Number(e.target.value) })} className={inp} min={3} max={20} />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Filtra per collezione</label>
                      <input type="text" value={settings.home.scrollCollezione} onChange={e => update('home', { scrollCollezione: e.target.value })} placeholder="es. CA27 (vuoto = tutti)" className={inp} />
                    </div>
                  </div>
                )}
              </div>

              {/* Foto */}
              <div className="space-y-3 pt-2 border-t border-border">
                <p className="text-2xs font-semibold text-gray-400">Foto</p>
                <ToggleRow label="Mostra foto editoriale" checked={settings.home.editorialAttivo} onChange={v => update('home', { editorialAttivo: v })} />
                {settings.home.editorialAttivo && (<>
                  <ImageUploadInput label="Foto" value={settings.home.editorialUrl} onChange={url => update('home', { editorialUrl: url })} />
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Didascalia (opzionale)</label>
                    <input type="text" value={settings.home.editorialCaption} onChange={e => update('home', { editorialCaption: e.target.value })} className={inp} />
                  </div>
                </>)}
              </div>
            </div>
            <SaveButton onClick={() => saveSection(homeKeys, 'Homepage')} loading={saving === 'Homepage'} />
          </SectionCard>

          {/* Colori tema */}
          <SectionCard title="Colori tema">
            <div className="space-y-3">
              {([['sfondo','Sfondo'],['pulsanti','Pulsanti'],['testoPulsanti','Testo pulsanti'],['testo','Testo principale']] as [keyof AppSettingsData['colori'], string][]).map(([k, label]) => (
                <div key={k} className="flex items-center gap-3">
                  <input type="color" value={settings.colori[k]} onChange={e => update('colori', { [k]: e.target.value } as Partial<AppSettingsData['colori']>)} className="w-9 h-9 rounded border border-border cursor-pointer flex-shrink-0" />
                  <span className="text-sm text-gray-700 w-36 flex-shrink-0">{label}</span>
                  <input type="text" value={settings.colori[k]} onChange={e => update('colori', { [k]: e.target.value } as Partial<AppSettingsData['colori']>)} className="flex-1 border border-border rounded px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-gray-900" />
                </div>
              ))}
            </div>
            <SaveButton onClick={() => saveSection(coloriKeys, 'Colori')} loading={saving === 'Colori'} />
          </SectionCard>

          {/* Social media */}
          <SectionCard title="Social media">
            <p className="text-xs text-gray-400">Trascina per riordinare · toggle per mostrare/nascondere · modifica il link.</p>
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

          {/* Comunicazioni */}
          <SectionCard title="Comunicazioni">
            <p className="text-xs text-gray-400">Crea messaggi evidenziati nella homepage dei clienti — notizie, promozioni, avvisi.</p>
            <div className="space-y-2">
              <ComunicazioneEditor
                label="Messaggio 1"
                cs={settings.comunicazione}
                onUpdate={p => update('comunicazione', p)}
                saving={saving === 'Comunicazione'}
                onSave={() => saveSection(comunicazioneKeys, 'Comunicazione')}
              />
              <ComunicazioneEditor
                label="Messaggio 2"
                cs={settings.comunicazione2}
                onUpdate={p => update('comunicazione2', p as Partial<AppSettingsData['comunicazione2']>)}
                saving={saving === 'Comunicazione2'}
                onSave={() => saveSection(comunicazione2Keys, 'Comunicazione2')}
              />
            </div>
          </SectionCard>

        </div>
      </div>

      {/* ── Collezioni ────────────────────────────────────────── */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-3">Collezioni</p>
        <div className="bg-white border border-border rounded-xl p-4 space-y-3">
          <p className="text-xs text-gray-400">Crea e gestisci le collezioni visibili nell&apos;app. Ogni collezione ha date, titolo, foto e impostazioni proprie.</p>
          <div className="space-y-2">
            {collezioni.map((col, i) => (
              <CollezioneCard
                key={i}
                item={col}
                onChange={patch => setCollezioni(prev => prev.map((c, j) => j === i ? { ...c, ...patch } : c))}
                onDelete={() => setCollezioni(prev => prev.filter((_, j) => j !== i))}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => setCollezioni(prev => [...prev, { id: `col-${Date.now()}`, titolo: '', sottotitolo: '', fotoUrl: '', dataInizio: '', dataScadenza: '', dataFine: '', scrollAttivo: true }])}
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-600 border border-dashed border-border rounded-lg hover:border-gray-400 hover:text-gray-800 transition-colors w-full justify-center"
          >
            <Plus size={13} /> Aggiungi collezione
          </button>
          <SaveButton onClick={saveCollezioni} loading={savingCollezioni} />
        </div>
      </div>

      {/* ── Visualizzazione ───────────────────────────────────── */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-3">Visualizzazione</p>
        <div className="space-y-3">

          {/* Menu navigazione */}
          <SectionCard title="Menu navigazione">
            <p className="text-xs text-gray-400">Trascina per riordinare · modifica il nome · toggle per mostrare/nascondere.</p>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleMenuDragEnd}>
              <SortableContext items={settings.menu.ordine} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {settings.menu.ordine.map(key => (
                    <SortableMenuItem key={key} item={{ key, ...settings.menu.items[key] }} onChange={handleMenuItemChange} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
            <SaveButton onClick={() => saveSection(menuKeys, 'Menu')} loading={saving === 'Menu'} />
          </SectionCard>

          {/* Scheda prodotto */}
          <SectionCard title="Scheda prodotto">
            <div className="space-y-2">
              {SCHEDA_FIELDS.map(([k, label]) => (
                <ToggleRow key={k} label={label} checked={settings.scheda[k]} onChange={v => update('scheda', { [k]: v })} />
              ))}
            </div>
            <SaveButton onClick={() => saveSection(schedaKeys, 'Scheda')} loading={saving === 'Scheda'} />
          </SectionCard>

          {/* Card catalogo */}
          <SectionCard title="Card catalogo">
            <div className="space-y-2">
              {CARD_FIELDS.map(([k, label]) => (
                <ToggleRow key={k} label={label} checked={settings.card[k]} onChange={v => update('card', { [k]: v })} />
              ))}
            </div>
            <SaveButton onClick={() => saveSection(cardKeys, 'Card')} loading={saving === 'Card'} />
          </SectionCard>

          {/* Dati finanziari ordine */}
          <SectionCard title="Dati finanziari ordine">
            <p className="text-xs text-gray-400">Scegli quali campi finanziari mostrare al cliente nella barra ordine e nella pagina ordini.</p>
            <div className="space-y-2">
              {ORDINE_FIELDS.map(([k, label]) => (
                <ToggleRow key={k} label={label} checked={settings.ordine[k]} onChange={v => update('ordine', { [k]: v })} />
              ))}
            </div>
            <SaveButton onClick={() => saveSection(ordineKeys, 'Ordine')} loading={saving === 'Ordine'} />
          </SectionCard>

          {/* Filtri catalogo cliente */}
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
                      setFiltriVisibili(ALL_CATALOG_FILTERS.map(f => f.key).filter(k => k !== key));
                    } else {
                      const next = filtriVisibili.includes(key) ? filtriVisibili.filter(k => k !== key) : [...filtriVisibili, key];
                      setFiltriVisibili(next);
                    }
                  }}
                />
              ))}
            </div>
            <div className="flex items-center justify-between pt-2">
              <button onClick={() => setFiltriVisibili([])} className="text-xs text-gray-400 hover:text-primary transition-colors">Abilita tutti</button>
              <button onClick={saveFiltri} disabled={savingFiltri} className="px-4 py-2 bg-gray-900 text-white text-xs font-medium rounded hover:bg-gray-700 disabled:opacity-50 transition-colors">
                {savingFiltri ? 'Salvataggio…' : 'Salva'}
              </button>
            </div>
          </SectionCard>

        </div>
      </div>
    </div>
  );
}
