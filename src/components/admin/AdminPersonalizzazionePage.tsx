'use client';

import { useState, useCallback, useRef } from 'react';
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

export default function AdminPersonalizzazionePage() {
  const [settings, setSettings] = useState<AppSettingsData>(DEFAULT_APP_SETTINGS);
  const [saving, setSaving] = useState<string | null>(null);

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

      {/* ── 3e: Colori tema ───────────────────────────────────── */}
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
    </div>
  );
}
