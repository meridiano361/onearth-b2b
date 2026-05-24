'use client';

import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { GripVertical } from 'lucide-react';
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

// ─── Types ────────────────────────────────────────────────────────────────────

type SettingsFlat = Record<string, string>;

function settingsToFlat(s: AppSettingsData): SettingsFlat {
  const f: SettingsFlat = {};
  // home
  f['home.titolo1'] = s.home.titolo1;
  f['home.titolo1.maiuscolo'] = String(s.home.titolo1Maiuscolo);
  f['home.titolo1.colore'] = s.home.titolo1Colore;
  f['home.titolo1.size'] = String(s.home.titolo1Size);
  f['home.titolo2'] = s.home.titolo2;
  f['home.titolo2.colore'] = s.home.titolo2Colore;
  f['home.titolo2.size'] = String(s.home.titolo2Size);
  f['home.cta'] = s.home.cta;
  f['home.scrollAttivo'] = String(s.home.scrollAttivo);
  f['home.scrollNumero'] = String(s.home.scrollNumero);
  f['home.scrollCollezione'] = s.home.scrollCollezione;
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
        className="flex-1 text-sm bg-transparent border-none outline-none text-primary"
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

  const homeKeys = [
    'home.titolo1', 'home.titolo1.maiuscolo', 'home.titolo1.colore', 'home.titolo1.size',
    'home.titolo2', 'home.titolo2.colore', 'home.titolo2.size',
    'home.cta', 'home.scrollAttivo', 'home.scrollNumero', 'home.scrollCollezione',
  ];
  const menuKeys = ['menu.ordine', ...settings.menu.ordine.flatMap((k) => [`menu.${k}.label`, `menu.${k}.visibile`])];
  const schedaKeys = Object.keys(settings.scheda).map((k) => `scheda.${k}`);
  const cardKeys = Object.keys(settings.card).map((k) => `card.${k}`);
  const coloriKeys = ['colori.sfondo', 'colori.pulsanti', 'colori.testoPulsanti', 'colori.testo'];

  if (isLoading) {
    return <div className="p-8 text-sm text-gray-400">Caricamento impostazioni…</div>;
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-lg font-semibold text-primary">Personalizzazione</h1>

      {/* ── 3a: Homepage ─────────────────────────────────────── */}
      <SectionCard title="Homepage">
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Titolo 1</label>
            <input
              type="text"
              value={settings.home.titolo1}
              onChange={(e) => update('home', { titolo1: e.target.value })}
              className="w-full border border-border rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-gray-900"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Dimensione (px)</label>
              <input
                type="number"
                value={settings.home.titolo1Size}
                onChange={(e) => update('home', { titolo1Size: Number(e.target.value) })}
                className="w-full border border-border rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-gray-900"
                min={10} max={60}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Colore</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={settings.home.titolo1Colore}
                  onChange={(e) => update('home', { titolo1Colore: e.target.value })}
                  className="w-8 h-8 rounded border border-border cursor-pointer"
                />
                <input
                  type="text"
                  value={settings.home.titolo1Colore}
                  onChange={(e) => update('home', { titolo1Colore: e.target.value })}
                  className="flex-1 border border-border rounded px-2 py-1.5 text-xs outline-none"
                />
              </div>
            </div>
            <div className="flex flex-col justify-end">
              <ToggleRow
                label="Maiuscolo"
                checked={settings.home.titolo1Maiuscolo}
                onChange={(v) => update('home', { titolo1Maiuscolo: v })}
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">Titolo 2</label>
            <input
              type="text"
              value={settings.home.titolo2}
              onChange={(e) => update('home', { titolo2: e.target.value })}
              className="w-full border border-border rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-gray-900"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Dimensione (px)</label>
              <input
                type="number"
                value={settings.home.titolo2Size}
                onChange={(e) => update('home', { titolo2Size: Number(e.target.value) })}
                className="w-full border border-border rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-gray-900"
                min={10} max={40}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Colore</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={settings.home.titolo2Colore}
                  onChange={(e) => update('home', { titolo2Colore: e.target.value })}
                  className="w-8 h-8 rounded border border-border cursor-pointer"
                />
                <input
                  type="text"
                  value={settings.home.titolo2Colore}
                  onChange={(e) => update('home', { titolo2Colore: e.target.value })}
                  className="flex-1 border border-border rounded px-2 py-1.5 text-xs outline-none"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">Testo CTA</label>
            <input
              type="text"
              value={settings.home.cta}
              onChange={(e) => update('home', { cta: e.target.value })}
              className="w-full border border-border rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-gray-900"
            />
          </div>

          <ToggleRow
            label="Mostra scroll prodotti"
            checked={settings.home.scrollAttivo}
            onChange={(v) => update('home', { scrollAttivo: v })}
          />

          {settings.home.scrollAttivo && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Numero prodotti</label>
                <input
                  type="number"
                  value={settings.home.scrollNumero}
                  onChange={(e) => update('home', { scrollNumero: Number(e.target.value) })}
                  className="w-full border border-border rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-gray-900"
                  min={1} max={50}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Filtra per collezione</label>
                <input
                  type="text"
                  value={settings.home.scrollCollezione}
                  onChange={(e) => update('home', { scrollCollezione: e.target.value })}
                  placeholder="es. CA27"
                  className="w-full border border-border rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-gray-900"
                />
              </div>
            </div>
          )}
        </div>
        <SaveButton onClick={() => saveSection(homeKeys, 'Homepage')} loading={saving === 'Homepage'} />
      </SectionCard>

      {/* ── 3b: Menu navigazione ─────────────────────────────── */}
      <SectionCard title="Menu navigazione">
        <p className="text-xs text-gray-400">Trascina per riordinare. Usa il toggle per mostrare/nascondere.</p>
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
    </div>
  );
}
