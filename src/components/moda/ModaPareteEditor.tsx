'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Plus, X, Search, Loader2, ChevronUp, ChevronDown,
  Trash2, Edit2, Check, Tag, PackagePlus, AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type {
  PareteAttrezzata, ElementoParete, ItemParete,
  TipoCapo, TipoElementoParete, DimensioneMensola, DimensioneBarra,
  MensolaInlineConfig,
} from '@/types';
import type { Product } from '@/types';
import { MODA_COLLEZIONE } from '@/lib/modaAccess';
import { nanoid } from 'nanoid';

// ─── Constants ───────────────────────────────────────────────────────────────

function colorForTipo(tipo: TipoCapo): string {
  const map: Record<TipoCapo, string> = {
    top: '#4f7c9c', bottom: '#6b5a8c', abito: '#8c5a7c',
    capospalla: '#4a6b4a', borsa: '#8c7a4a', accessorio: '#8c6a4a', altro: '#9ca3af',
  };
  return map[tipo] ?? '#9ca3af';
}

const TIPO_LABELS: Record<TipoCapo, string> = {
  top: 'Top', bottom: 'Bottom', abito: 'Abito',
  capospalla: 'Capospalla', borsa: 'Borsa', accessorio: 'Accessorio', altro: 'Altro',
};

const TIPO_OPTIONS_BARRA: TipoCapo[] = ['capospalla', 'top', 'bottom', 'abito'];
const TIPO_OPTIONS_MENSOLA: TipoCapo[] = ['borsa', 'accessorio', 'top', 'bottom', 'abito', 'altro'];
const TIPO_OPTIONS_FRONTALE: TipoCapo[] = ['abito', 'capospalla', 'top', 'bottom', 'borsa', 'accessorio', 'altro'];

const TAGLIE_ABBIGLIAMENTO = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'TU'];
const TAGLIE_BORSE = ['TU', 'SMALL', 'MEDIUM', 'LARGE'];

const BARRA_MAX_PZ: Record<DimensioneBarra, number> = { piccola: 24, media: 32, grande: 48 };
const BARRA_DIMS: DimensioneBarra[] = ['piccola', 'media', 'grande'];
const MENSOLA_DIMS: DimensioneMensola[] = ['piccola', 'media', 'lunga'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function totalePezzi(items: ItemParete[]): number {
  return items.reduce((acc, it) => acc + it.pezzi.length, 0);
}

function tipoFromProduct(p: Product, elementoTipo: TipoElementoParete): TipoCapo {
  const fam = (p.famiglia ?? '').toLowerCase();
  const sf = (p.sottofamiglia ?? '').toLowerCase();
  const name = p.name.toLowerCase();
  if (/borsa|bag|clutch|tote|shopper/.test(fam + sf + name)) return 'borsa';
  if (/accessori|sciarpa|stola|cintura|cappello|belt|hat/.test(fam + sf + name)) return 'accessorio';
  if (/abito|vestito|dress/.test(sf + name)) return 'abito';
  if (/giaccone|cappotto|giubbott|parka|blazer|coat|jacket/.test(sf + name)) return 'capospalla';
  if (/pantal|gonna|skirt|short|trouser/.test(sf + name)) return 'bottom';
  if (/top|shirt|blusa|camicia|maglia|felpa|maglione|pull|sweat/.test(sf + name)) return 'top';
  if (elementoTipo === 'mensola') return 'borsa';
  if (elementoTipo === 'frontale') return 'abito';
  return 'top';
}

// ─── Catalog picker modal (multi-select) ─────────────────────────────────────

function CatalogPickerModal({
  elementoTipo,
  onAdd,
  onClose,
}: {
  elementoTipo: TipoElementoParete;
  onAdd: (items: ItemParete[]) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data, isLoading } = useQuery<{ data: Product[] }>({
    queryKey: ['moda-products-panel'],
    queryFn: () => fetch(`/api/products?active=true&collezione=${MODA_COLLEZIONE}&limit=500`).then((r) => r.json()),
    staleTime: 60_000,
  });

  const products = data?.data ?? [];
  const filtered = useMemo(() => {
    if (!search.trim()) return products.slice(0, 100);
    const q = search.toLowerCase();
    return products.filter((p) => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q));
  }, [products, search]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function handleConfirm() {
    const sel = products.filter((p) => selected.has(p.id));
    const items: ItemParete[] = sel.map((p) => ({
      id: nanoid(8),
      tipo: tipoFromProduct(p, elementoTipo),
      productId: p.id, productCode: p.code, productName: p.name,
      imageUrl: p.imageUrl ?? undefined, pezzi: [],
    }));
    onAdd(items);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white border border-gray-200 rounded-t-2xl sm:rounded-2xl flex flex-col max-h-[85vh] shadow-xl">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
          <PackagePlus size={16} className="text-gray-400 flex-shrink-0" />
          <p className="flex-1 text-sm font-medium text-gray-900">Importa dal catalogo PE27</p>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input autoFocus value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Cerca per nome o codice…"
              className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:border-gray-400" />
          </div>
        </div>
        <div className="overflow-y-auto flex-1">
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-gray-300" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-center py-8 text-xs text-gray-400">Nessun risultato</p>
          ) : filtered.map((p) => {
            const isChecked = selected.has(p.id);
            return (
              <button key={p.id} onClick={() => toggle(p.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left ${isChecked ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${isChecked ? 'bg-primary border-primary' : 'border-gray-300'}`}>
                  {isChecked && <Check size={10} className="text-white" />}
                </div>
                {p.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.imageUrl} alt={p.name} className="w-9 h-9 object-cover rounded flex-shrink-0" />
                ) : (
                  <div className="w-9 h-9 bg-gray-100 rounded flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-900 truncate">{p.name}</p>
                  <p className="text-2xs text-gray-400 font-mono">{p.code}{p.famiglia ? ` · ${p.famiglia}` : ''}</p>
                </div>
                <span className="text-2xs text-gray-400 flex-shrink-0 font-medium">{TIPO_LABELS[tipoFromProduct(p, elementoTipo)]}</span>
              </button>
            );
          })}
        </div>
        <div className="px-4 py-3 border-t border-gray-100 flex items-center gap-3">
          <p className="flex-1 text-xs text-gray-400">
            {selected.size === 0 ? 'Nessun prodotto selezionato' : `${selected.size} prodott${selected.size === 1 ? 'o' : 'i'} selezionat${selected.size === 1 ? 'o' : 'i'}`}
          </p>
          <button onClick={onClose} className="px-3 py-2 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">Annulla</button>
          <button onClick={handleConfirm} disabled={selected.size === 0}
            className="px-4 py-2 bg-primary text-white text-xs font-medium rounded-lg disabled:opacity-40 hover:bg-primary/90 transition-colors">
            Aggiungi {selected.size > 0 ? `(${selected.size})` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Product picker (single) ─────────────────────────────────────────────────

function ProductPickerModal({ onSelect, onClose }: { onSelect: (p: Product) => void; onClose: () => void }) {
  const [search, setSearch] = useState('');
  const { data, isLoading } = useQuery<{ data: Product[] }>({
    queryKey: ['moda-products-panel'],
    queryFn: () => fetch(`/api/products?active=true&collezione=${MODA_COLLEZIONE}&limit=500`).then((r) => r.json()),
    staleTime: 60_000,
  });
  const products = data?.data ?? [];
  const filtered = useMemo(() => {
    if (!search.trim()) return products.slice(0, 80);
    const q = search.toLowerCase();
    return products.filter((p) => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q));
  }, [products, search]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white border border-gray-200 rounded-t-2xl sm:rounded-2xl flex flex-col max-h-[80vh] shadow-xl">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
          <p className="flex-1 text-sm font-medium text-gray-900">Seleziona prodotto PE27</p>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input autoFocus value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Cerca per nome o codice…"
              className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:border-gray-400" />
          </div>
        </div>
        <div className="overflow-y-auto flex-1">
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-gray-300" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-center py-8 text-xs text-gray-400">Nessun risultato</p>
          ) : filtered.map((p) => (
            <button key={p.id} onClick={() => { onSelect(p); onClose(); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left">
              {p.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.imageUrl} alt={p.name} className="w-8 h-8 object-cover rounded flex-shrink-0" />
              ) : <div className="w-8 h-8 bg-gray-100 rounded flex-shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-900 truncate">{p.name}</p>
                <p className="text-2xs text-gray-400 font-mono">{p.code}</p>
              </div>
            </button>
          ))}
        </div>
        <div className="px-4 py-3 border-t border-gray-100">
          <button onClick={onClose} className="w-full text-xs text-gray-400 hover:text-gray-600 transition-colors">
            Senza prodotto collegato — prosegui manualmente
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Item card ───────────────────────────────────────────────────────────────

function ItemCard({
  item, tipoOptions, onChange, onDelete, onMoveLeft, onMoveRight, canMoveLeft, canMoveRight,
}: {
  item: ItemParete; tipoOptions: TipoCapo[];
  onChange: (u: ItemParete) => void; onDelete: () => void;
  onMoveLeft?: () => void; onMoveRight?: () => void;
  canMoveLeft?: boolean; canMoveRight?: boolean;
}) {
  const [showPicker, setShowPicker] = useState(false);
  const taglieSuggested = item.tipo === 'borsa' || item.tipo === 'accessorio' ? TAGLIE_BORSE : TAGLIE_ABBIGLIAMENTO;
  const activeTaglie = new Set(item.pezzi.map((p) => p.taglia));

  function toggleTaglia(t: string) {
    onChange({ ...item, pezzi: activeTaglie.has(t) ? item.pezzi.filter((p) => p.taglia !== t) : [...item.pezzi, { taglia: t }] });
  }
  function addCustomTaglia(t: string) {
    if (!t.trim() || activeTaglie.has(t.toUpperCase())) return;
    onChange({ ...item, pezzi: [...item.pezzi, { taglia: t.toUpperCase() }] });
  }

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-2.5">
      <div className="flex items-start gap-2">
        <div className="w-2.5 h-10 rounded-sm flex-shrink-0 mt-0.5" style={{ backgroundColor: item.coloreHex ?? colorForTipo(item.tipo) }} />
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex flex-wrap gap-1">
            {tipoOptions.map((t) => (
              <button key={t} type="button" onClick={() => onChange({ ...item, tipo: t })}
                className={`px-2 py-0.5 rounded-full text-2xs font-medium transition-colors ${item.tipo === t ? 'bg-primary text-white' : 'text-gray-500 border border-gray-200 hover:border-gray-400'}`}>
                {TIPO_LABELS[t]}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setShowPicker(true)}
            className="flex items-center gap-1.5 text-2xs text-gray-400 hover:text-gray-600 transition-colors">
            <Tag size={10} />
            {item.productCode
              ? <span className="font-mono text-gray-600">{item.productCode} — {item.productName}</span>
              : <span>Collega prodotto</span>}
          </button>
        </div>
        <div className="flex gap-0.5 flex-shrink-0">
          {onMoveLeft && <button type="button" onClick={onMoveLeft} disabled={!canMoveLeft} className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-gray-600 disabled:opacity-20 transition-colors"><ChevronUp size={14} /></button>}
          {onMoveRight && <button type="button" onClick={onMoveRight} disabled={!canMoveRight} className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-gray-600 disabled:opacity-20 transition-colors"><ChevronDown size={14} /></button>}
          <button type="button" onClick={onDelete} className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-red-500 transition-colors"><X size={14} /></button>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input type="color" value={item.coloreHex ?? colorForTipo(item.tipo)} onChange={(e) => onChange({ ...item, coloreHex: e.target.value })}
          className="w-6 h-6 rounded border border-gray-200 cursor-pointer bg-transparent p-0" title="Colore capo" />
        <span className="text-2xs text-gray-400">Colore nell'esposizione</span>
      </div>
      <div>
        <p className="text-2xs text-gray-500 mb-1.5">Taglie <span className="text-gray-400">({item.pezzi.length} pz)</span></p>
        <div className="flex flex-wrap gap-1">
          {taglieSuggested.map((t) => (
            <button key={t} type="button" onClick={() => toggleTaglia(t)}
              className={`px-2 py-0.5 rounded text-2xs font-mono transition-colors ${activeTaglie.has(t) ? 'bg-primary text-white border border-primary' : 'text-gray-500 border border-gray-200 hover:border-gray-400'}`}>
              {t}
            </button>
          ))}
          <CustomTagliaInput onAdd={addCustomTaglia} />
        </div>
      </div>
      {showPicker && (
        <ProductPickerModal
          onSelect={(p) => onChange({ ...item, productId: p.id, productCode: p.code, productName: p.name, imageUrl: p.imageUrl ?? undefined })}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}

function CustomTagliaInput({ onAdd }: { onAdd: (t: string) => void }) {
  const [value, setValue] = useState('');
  const [editing, setEditing] = useState(false);
  if (!editing) return (
    <button type="button" onClick={() => setEditing(true)}
      className="px-2 py-0.5 rounded text-2xs text-gray-400 border border-dashed border-gray-300 hover:border-gray-500 transition-colors">
      + altra
    </button>
  );
  return (
    <input autoFocus value={value} onChange={(e) => setValue(e.target.value.toUpperCase())}
      onKeyDown={(e) => { if (e.key === 'Enter') { onAdd(value); setValue(''); setEditing(false); } if (e.key === 'Escape') { setValue(''); setEditing(false); } }}
      onBlur={() => { if (value) onAdd(value); setValue(''); setEditing(false); }}
      placeholder="44…" className="w-14 px-2 py-0.5 rounded text-2xs font-mono text-gray-900 bg-white border border-gray-300 focus:outline-none" />
  );
}

// ─── Single-item frontale editor (inline) ────────────────────────────────────

function FrontaleInlineEditor({
  label, item, onChange, onRemove,
}: {
  label: string; item?: ItemParete;
  onChange: (it: ItemParete) => void; onRemove: () => void;
}) {
  const [showPicker, setShowPicker] = useState(false);

  if (!item) {
    return (
      <button type="button" onClick={() => onChange({ id: nanoid(8), tipo: 'abito', pezzi: [] })}
        className="flex-1 py-2 border border-dashed border-gray-200 rounded-xl text-xs text-gray-400 hover:border-gray-400 hover:text-gray-600 transition-colors flex items-center justify-center gap-1.5">
        <Plus size={12} /> {label}
      </button>
    );
  }

  return (
    <div className="flex-1 bg-gray-50 border border-gray-200 rounded-xl p-2.5 space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-7 rounded-sm flex-shrink-0" style={{ backgroundColor: item.coloreHex ?? colorForTipo(item.tipo) }} />
          <div>
            <p className="text-2xs font-medium text-gray-600">{label}</p>
            <div className="flex gap-0.5 flex-wrap mt-0.5">
              {TIPO_OPTIONS_FRONTALE.slice(0, 4).map((t) => (
                <button key={t} type="button" onClick={() => onChange({ ...item, tipo: t })}
                  className={`px-1.5 py-0 rounded-full text-2xs transition-colors ${item.tipo === t ? 'bg-primary text-white' : 'text-gray-400 border border-gray-200 hover:border-gray-400'}`}
                  style={{ fontSize: 9 }}>
                  {TIPO_LABELS[t]}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <input type="color" value={item.coloreHex ?? colorForTipo(item.tipo)} onChange={(e) => onChange({ ...item, coloreHex: e.target.value })}
            className="w-5 h-5 rounded border border-gray-200 cursor-pointer bg-transparent p-0" />
          <button type="button" onClick={() => setShowPicker(true)} className="text-gray-300 hover:text-gray-600 transition-colors" title="Collega prodotto"><Tag size={12} /></button>
          <button type="button" onClick={onRemove} className="text-gray-300 hover:text-red-500 transition-colors"><X size={12} /></button>
        </div>
      </div>
      <div className="flex flex-wrap gap-0.5">
        {TAGLIE_ABBIGLIAMENTO.map((t) => {
          const active = item.pezzi.some((p) => p.taglia === t);
          return (
            <button key={t} type="button"
              onClick={() => onChange({ ...item, pezzi: active ? item.pezzi.filter((p) => p.taglia !== t) : [...item.pezzi, { taglia: t }] })}
              className={`px-1.5 py-0 rounded text-2xs font-mono transition-colors ${active ? 'bg-primary text-white' : 'text-gray-400 border border-gray-200 hover:border-gray-400'}`}
              style={{ fontSize: 9 }}>
              {t}
            </button>
          );
        })}
      </div>
      {item.productCode && <p className="text-2xs text-gray-400 font-mono truncate">{item.productCode}</p>}
      {showPicker && (
        <ProductPickerModal
          onSelect={(p) => onChange({ ...item, productId: p.id, productCode: p.code, productName: p.name, imageUrl: p.imageUrl ?? undefined })}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}

// ─── Mensola inline editor ───────────────────────────────────────────────────

function MensolaInlineEditor({
  config, onChange, onRemove,
}: {
  config?: MensolaInlineConfig;
  onChange: (c: MensolaInlineConfig) => void;
  onRemove: () => void;
}) {
  const [showCatalog, setShowCatalog] = useState(false);

  if (!config) {
    return (
      <button type="button"
        onClick={() => onChange({ dimensione: 'media', items: [] })}
        className="w-full py-1.5 border border-dashed border-amber-200 rounded-lg text-2xs text-amber-600 hover:bg-amber-50 transition-colors flex items-center justify-center gap-1">
        <Plus size={11} /> Mensola sopra
      </button>
    );
  }

  function updateItem(idx: number, updated: ItemParete) {
    const items = [...config!.items]; items[idx] = updated; onChange({ ...config!, items });
  }
  function removeItem(idx: number) { onChange({ ...config!, items: config!.items.filter((_, i) => i !== idx) }); }
  function addFromCatalog(newItems: ItemParete[]) { onChange({ ...config!, items: [...config!.items, ...newItems] }); }
  function addBlank() { onChange({ ...config!, items: [...config!.items, { id: nanoid(8), tipo: 'borsa', pezzi: [] }] }); }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
        <p className="text-xs font-medium text-amber-800 flex-1">Mensola sopra</p>
        <div className="flex gap-1">
          {MENSOLA_DIMS.map((d) => (
            <button key={d} type="button" onClick={() => onChange({ ...config, dimensione: d })}
              className={`px-2 py-0.5 text-2xs rounded-full transition-colors ${config.dimensione === d ? 'bg-amber-400 text-white' : 'text-amber-600 border border-amber-200 hover:bg-amber-100'}`}>
              {d}
            </button>
          ))}
        </div>
        <button type="button" onClick={onRemove} className="text-amber-300 hover:text-red-400 transition-colors"><X size={13} /></button>
      </div>
      {config.items.map((it, idx) => (
        <ItemCard key={it.id} item={it} tipoOptions={TIPO_OPTIONS_MENSOLA}
          onChange={(u) => updateItem(idx, u)} onDelete={() => removeItem(idx)}
          onMoveLeft={() => { const a = [...config.items]; const [m] = a.splice(idx, 1); a.splice(idx - 1, 0, m); onChange({ ...config, items: a }); }}
          onMoveRight={() => { const a = [...config.items]; const [m] = a.splice(idx, 1); a.splice(idx + 1, 0, m); onChange({ ...config, items: a }); }}
          canMoveLeft={idx > 0} canMoveRight={idx < config.items.length - 1} />
      ))}
      <div className="flex gap-2">
        <button type="button" onClick={() => setShowCatalog(true)}
          className="flex-1 py-1.5 bg-white border border-amber-200 rounded-lg text-2xs text-amber-700 hover:bg-amber-50 transition-colors flex items-center justify-center gap-1 font-medium">
          <PackagePlus size={11} /> Importa
        </button>
        <button type="button" onClick={addBlank}
          className="py-1.5 px-2.5 border border-dashed border-amber-200 rounded-lg text-2xs text-amber-600 hover:bg-amber-50 transition-colors flex items-center gap-1">
          <Plus size={11} /> Manuale
        </button>
      </div>
      {showCatalog && <CatalogPickerModal elementoTipo="mensola" onAdd={addFromCatalog} onClose={() => setShowCatalog(false)} />}
    </div>
  );
}

// ─── Elemento card ────────────────────────────────────────────────────────────

function ElementoCard({
  el, index, total, onChange, onDelete, onMoveUp, onMoveDown,
}: {
  el: ElementoParete; index: number; total: number;
  onChange: (u: ElementoParete) => void; onDelete: () => void;
  onMoveUp: () => void; onMoveDown: () => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [showCatalogPicker, setShowCatalogPicker] = useState(false);

  const tipoOptions = el.tipo === 'barra' ? TIPO_OPTIONS_BARRA : el.tipo === 'mensola' ? TIPO_OPTIONS_MENSOLA : TIPO_OPTIONS_FRONTALE;

  const isBarra = el.tipo === 'barra';
  const isMensola = el.tipo === 'mensola';
  const isFrontale = el.tipo === 'frontale';

  const barraDim = (el.dimensione ?? 'media') as DimensioneBarra;
  const maxPz = isBarra ? BARRA_MAX_PZ[barraDim] : null;
  const pzCount = isBarra ? totalePezzi(el.items) : null;
  const pzOver = maxPz !== null && pzCount !== null && pzCount > maxPz;

  function addBlankItem() {
    const defaultTipo: TipoCapo = isMensola ? 'borsa' : isFrontale ? 'abito' : 'top';
    onChange({ ...el, items: [...el.items, { id: nanoid(8), tipo: defaultTipo, pezzi: [] }] });
  }
  function addFromCatalog(items: ItemParete[]) { onChange({ ...el, items: [...el.items, ...items] }); }
  function updateItem(idx: number, updated: ItemParete) { const a = [...el.items]; a[idx] = updated; onChange({ ...el, items: a }); }
  function removeItem(idx: number) { onChange({ ...el, items: el.items.filter((_, i) => i !== idx) }); }
  function moveItem(from: number, to: number) { const a = [...el.items]; const [m] = a.splice(from, 1); a.splice(to, 0, m); onChange({ ...el, items: a }); }

  const elLabel = isBarra ? 'Barra appenderia' : isMensola ? `Mensola ${el.dimensione ?? ''}` : 'Esposizione frontale';
  const totalPz = totalePezzi(el.items);

  return (
    <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-gray-50">
        <div className="flex flex-col gap-0.5">
          <button type="button" onClick={onMoveUp} disabled={index === 0} className="text-gray-300 hover:text-gray-600 disabled:opacity-20 transition-colors"><ChevronUp size={14} /></button>
          <button type="button" onClick={onMoveDown} disabled={index === total - 1} className="text-gray-300 hover:text-gray-600 disabled:opacity-20 transition-colors"><ChevronDown size={14} /></button>
        </div>
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isBarra ? 'bg-blue-400' : isMensola ? 'bg-amber-400' : 'bg-emerald-400'}`} />
        <button type="button" onClick={() => setExpanded(!expanded)} className="flex-1 text-left min-w-0">
          <p className="text-sm font-medium text-gray-900">{elLabel}</p>
          <p className={`text-xs ${pzOver ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
            {el.items.length} capi
            {totalPz > 0 && ` · ${totalPz} pz`}
            {maxPz !== null && ` / max ${maxPz} pz`}
            {pzOver && ' — LIMITE SUPERATO'}
          </p>
        </button>

        {/* Dimension selector */}
        {isBarra && (
          <div className="flex gap-1 flex-shrink-0">
            {BARRA_DIMS.map((d) => (
              <button key={d} type="button" onClick={() => onChange({ ...el, dimensione: d })}
                className={`px-2 py-0.5 text-2xs rounded-full transition-colors ${barraDim === d ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'text-gray-400 border border-gray-200 hover:border-gray-400'}`}>
                {d}
              </button>
            ))}
          </div>
        )}
        {isMensola && (
          <div className="flex gap-1 flex-shrink-0">
            {MENSOLA_DIMS.map((d) => (
              <button key={d} type="button" onClick={() => onChange({ ...el, dimensione: d })}
                className={`px-2 py-0.5 text-2xs rounded-full transition-colors ${el.dimensione === d ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'text-gray-400 border border-gray-200 hover:border-gray-400'}`}>
                {d}
              </button>
            ))}
          </div>
        )}

        {pzOver && <AlertTriangle size={14} className="text-red-500 flex-shrink-0" />}
        <button type="button" onClick={onDelete} className="text-gray-300 hover:text-red-500 transition-colors ml-1 flex-shrink-0"><Trash2 size={14} /></button>
      </div>

      {expanded && (
        <div className="px-4 py-3 space-y-3">
          {/* Mensola sopra (only for barra and frontale) */}
          {(isBarra || isFrontale) && (
            <MensolaInlineEditor
              config={el.mensolaTop}
              onChange={(c) => onChange({ ...el, mensolaTop: c })}
              onRemove={() => onChange({ ...el, mensolaTop: undefined })}
            />
          )}

          {/* Main items */}
          <div className="space-y-2">
            {el.items.map((item, idx) => (
              <ItemCard key={item.id} item={item} tipoOptions={tipoOptions}
                onChange={(u) => updateItem(idx, u)} onDelete={() => removeItem(idx)}
                onMoveLeft={!isFrontale ? () => moveItem(idx, idx - 1) : undefined}
                onMoveRight={!isFrontale ? () => moveItem(idx, idx + 1) : undefined}
                canMoveLeft={idx > 0} canMoveRight={idx < el.items.length - 1} />
            ))}

            {(!isFrontale || el.items.length === 0) && (
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowCatalogPicker(true)}
                  className="flex-1 py-2 bg-primary/5 border border-primary/20 rounded-xl text-xs text-primary hover:bg-primary/10 transition-colors flex items-center justify-center gap-1.5 font-medium">
                  <PackagePlus size={13} /> Importa dal catalogo
                </button>
                <button type="button" onClick={addBlankItem}
                  className="py-2 px-3 border border-dashed border-gray-200 rounded-xl text-xs text-gray-400 hover:border-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1.5">
                  <Plus size={13} /> Manuale
                </button>
              </div>
            )}
          </div>

          {/* Frontali laterali (only for barra) */}
          {isBarra && (
            <div className="space-y-1.5">
              <p className="text-2xs text-gray-400 font-medium uppercase tracking-wide">Capi esposti frontalmente</p>
              <div className="flex gap-2">
                <FrontaleInlineEditor label="Sinistra" item={el.frontaleLeft}
                  onChange={(it) => onChange({ ...el, frontaleLeft: it })}
                  onRemove={() => onChange({ ...el, frontaleLeft: undefined })} />
                <FrontaleInlineEditor label="Destra" item={el.frontaleRight}
                  onChange={(it) => onChange({ ...el, frontaleRight: it })}
                  onRemove={() => onChange({ ...el, frontaleRight: undefined })} />
              </div>
            </div>
          )}
        </div>
      )}

      {showCatalogPicker && (
        <CatalogPickerModal elementoTipo={el.tipo} onAdd={addFromCatalog} onClose={() => setShowCatalogPicker(false)} />
      )}
    </div>
  );
}

// ─── Wall renderer ────────────────────────────────────────────────────────────

function WallRenderer({ config }: { config: ElementoParete[] }) {
  if (config.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-300 p-4">
        <p className="text-xs text-center">Aggiungi barre appenderia, mensole o frontali</p>
      </div>
    );
  }
  return (
    <div className="h-full overflow-y-auto space-y-4 p-4">
      {config.map((el) => <WallElementRenderer key={el.id} el={el} />)}
    </div>
  );
}

function WallElementRenderer({ el }: { el: ElementoParete }) {
  if (el.tipo === 'barra') {
    const dim = (el.dimensione ?? 'media') as DimensioneBarra;
    const pzTot = totalePezzi(el.items);
    const max = BARRA_MAX_PZ[dim];
    const over = pzTot > max;
    return (
      <div className="space-y-1">
        {/* Mensola sopra */}
        {el.mensolaTop && <MensolaRenderer config={el.mensolaTop} />}
        {/* Frontali + hanging items */}
        <div className="flex items-end gap-2">
          {el.frontaleLeft && <FrontaleSmall item={el.frontaleLeft} />}
          <div className="flex-1 min-w-0">
            <div className="flex gap-1 flex-wrap min-h-[32px] items-end">
              {el.items.length === 0
                ? <p className="text-2xs text-gray-300 italic">barra vuota</p>
                : el.items.map((it, i) => <CapoOnBarra key={it.id ?? i} item={it} />)}
            </div>
            <div className={`h-0.5 mt-0.5 rounded ${over ? 'bg-red-400' : 'bg-gray-400'} w-full`} />
            <p className={`text-2xs font-mono pl-0.5 ${over ? 'text-red-400' : 'text-gray-400'}`}>
              barra {dim} · {pzTot}/{max} pz
            </p>
          </div>
          {el.frontaleRight && <FrontaleSmall item={el.frontaleRight} />}
        </div>
      </div>
    );
  }

  if (el.tipo === 'mensola') {
    return <MensolaRenderer config={{ dimensione: (el.dimensione as DimensioneMensola) ?? 'media', items: el.items }} />;
  }

  if (el.tipo === 'frontale') {
    const it = el.items[0];
    return (
      <div className="space-y-1">
        {el.mensolaTop && <MensolaRenderer config={el.mensolaTop} />}
        <div className="flex gap-3 items-start">
          <div className="w-14 h-20 rounded border border-gray-200 flex-shrink-0 flex items-end justify-center pb-1"
            style={{ backgroundColor: it?.coloreHex ?? '#e5e7eb' }}>
            {it && <span className="text-2xs text-white font-mono drop-shadow-sm">{TIPO_LABELS[it.tipo]?.[0] ?? '?'}</span>}
          </div>
          <div>
            <p className="text-xs text-gray-700 font-medium">{it?.productCode ?? '—'}</p>
            <p className="text-2xs text-gray-400">{it?.productName ?? 'esposizione frontale'}</p>
            {it && it.pezzi.length > 0 && (
              <div className="flex gap-1 mt-1 flex-wrap">
                {it.pezzi.map((p, i) => <span key={i} className="text-2xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-mono">{p.taglia}</span>)}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}

function MensolaRenderer({ config }: { config: MensolaInlineConfig }) {
  const w = config.dimensione === 'piccola' ? 'w-1/3' : config.dimensione === 'media' ? 'w-2/3' : 'w-full';
  return (
    <div className="space-y-0.5">
      <div className="flex items-end gap-1.5 flex-wrap min-h-[24px]">
        {config.items.length === 0
          ? <p className="text-2xs text-gray-300 italic">mensola vuota</p>
          : config.items.map((it, i) => <CapoOnMensola key={it.id ?? i} item={it} />)}
      </div>
      <div className={`h-0.5 bg-gray-400 rounded ${w}`} />
      <p className="text-2xs text-gray-400 font-mono">mensola {config.dimensione}</p>
    </div>
  );
}

function FrontaleSmall({ item }: { item: ItemParete }) {
  return (
    <div className="flex flex-col items-center gap-0.5 flex-shrink-0" title={`Frontale — ${TIPO_LABELS[item.tipo]}`}>
      <div className="w-10 h-16 rounded border border-gray-200 flex items-end justify-center pb-0.5"
        style={{ backgroundColor: item.coloreHex ?? colorForTipo(item.tipo) }}>
        <span className="text-white font-bold" style={{ fontSize: 8 }}>{TIPO_LABELS[item.tipo][0]}</span>
      </div>
      {item.pezzi.length > 0 && <span className="text-gray-400" style={{ fontSize: 8 }}>{item.pezzi.length}pz</span>}
    </div>
  );
}

function CapoOnBarra({ item }: { item: ItemParete }) {
  return (
    <div className="flex flex-col items-center gap-0.5" title={`${TIPO_LABELS[item.tipo]}${item.productCode ? ` — ${item.productCode}` : ''}`}>
      <div className="w-1 h-1 bg-gray-500 rounded-full" />
      <div className="rounded-sm flex items-center justify-center"
        style={{ backgroundColor: item.coloreHex ?? colorForTipo(item.tipo), width: item.tipo === 'capospalla' ? 26 : item.tipo === 'abito' ? 16 : 18, height: item.tipo === 'abito' ? 40 : item.tipo === 'capospalla' ? 30 : 26 }}>
        <span className="font-bold text-white select-none" style={{ fontSize: 8 }}>{TIPO_LABELS[item.tipo][0]}</span>
      </div>
      {item.pezzi.length > 0 && <span className="text-gray-500 select-none" style={{ fontSize: 8 }}>{item.pezzi.length}pz</span>}
    </div>
  );
}

function CapoOnMensola({ item }: { item: ItemParete }) {
  return (
    <div className="rounded-sm flex items-center justify-center flex-shrink-0"
      style={{ backgroundColor: item.coloreHex ?? colorForTipo(item.tipo), width: item.tipo === 'borsa' ? 30 : 22, height: item.tipo === 'borsa' ? 26 : 18 }}
      title={`${TIPO_LABELS[item.tipo]} (${item.pezzi.length}pz)`}>
      <span className="font-bold text-white select-none" style={{ fontSize: 8 }}>{TIPO_LABELS[item.tipo][0]}</span>
    </div>
  );
}

// ─── Main editor ──────────────────────────────────────────────────────────────

export default function ModaPareteEditor({ pareteId }: { pareteId: string }) {
  const router = useRouter();
  const qc = useQueryClient();

  const { data, isLoading, isError } = useQuery<{ data: PareteAttrezzata }>({
    queryKey: ['moda-parete', pareteId],
    queryFn: () => fetch(`/api/moda/pareti/${pareteId}`).then((r) => r.json()),
    staleTime: 30_000,
  });

  const parete = data?.data;
  const [nome, setNome] = useState('');
  const [editingNome, setEditingNome] = useState(false);
  const [config, setConfig] = useState<ElementoParete[]>([]);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (parete && !initializedRef.current) {
      initializedRef.current = true;
      setNome(parete.nome);
      setConfig(Array.isArray(parete.configurazione) ? parete.configurazione as ElementoParete[] : []);
    }
  }, [parete]);

  const saveConfig = useCallback(async (newConfig: ElementoParete[], newNome?: string) => {
    setSaveStatus('saving');
    try {
      const body: Record<string, unknown> = { configurazione: newConfig };
      if (newNome !== undefined) body.nome = newNome;
      const res = await fetch(`/api/moda/pareti/${pareteId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      setSaveStatus('saved');
      qc.invalidateQueries({ queryKey: ['moda-pareti'] });
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
      toast.error('Errore nel salvataggio');
      setSaveStatus('idle');
    }
  }, [pareteId, qc]);

  function handleConfigChange(newConfig: ElementoParete[]) {
    setConfig(newConfig);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaveStatus('saving');
    saveTimerRef.current = setTimeout(() => saveConfig(newConfig), 1200);
  }

  function handleNomeSave() {
    setEditingNome(false);
    if (nome.trim() && nome !== parete?.nome) saveConfig(config, nome.trim());
  }

  function addElemento(tipo: TipoElementoParete) {
    const newEl: ElementoParete = {
      id: nanoid(8), tipo,
      dimensione: tipo === 'mensola' ? 'media' : tipo === 'barra' ? 'media' : undefined,
      items: [],
    };
    handleConfigChange([...config, newEl]);
  }

  function updateElemento(idx: number, updated: ElementoParete) {
    const next = [...config]; next[idx] = updated; handleConfigChange(next);
  }
  function deleteElemento(idx: number) { handleConfigChange(config.filter((_, i) => i !== idx)); }
  function moveElemento(from: number, to: number) {
    const next = [...config]; const [m] = next.splice(from, 1); next.splice(to, 0, m); handleConfigChange(next);
  }

  if (isLoading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 size={24} className="animate-spin text-gray-300" /></div>;
  if (isError || !parete) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><p className="text-sm text-gray-400">Layout non trovato</p></div>;

  const totalCapi = config.reduce((acc, el) => acc + el.items.length, 0);
  const totalPz = config.reduce((acc, el) => acc + totalePezzi(el.items), 0);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-gray-50/95 backdrop-blur border-b border-gray-100 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <button onClick={() => router.push('/moda/pareti')} className="text-gray-400 hover:text-gray-700 transition-colors"><ArrowLeft size={20} /></button>
          <div className="flex-1 min-w-0">
            {editingNome ? (
              <input autoFocus value={nome} onChange={(e) => setNome(e.target.value)}
                onBlur={handleNomeSave}
                onKeyDown={(e) => { if (e.key === 'Enter') handleNomeSave(); if (e.key === 'Escape') { setNome(parete.nome); setEditingNome(false); } }}
                className="bg-transparent border-b border-gray-400 text-base font-semibold text-gray-900 focus:outline-none w-full" />
            ) : (
              <button type="button" onClick={() => setEditingNome(true)} className="flex items-center gap-1.5 group">
                <h1 className="text-base font-semibold truncate text-gray-900">{nome}</h1>
                <Edit2 size={12} className="text-gray-300 group-hover:text-gray-500 transition-colors flex-shrink-0" />
              </button>
            )}
            <p className="text-xs text-gray-400">{config.length} elementi · {totalCapi} capi · {totalPz} pz</p>
          </div>
          <div className="flex-shrink-0">
            {saveStatus === 'saving' && <Loader2 size={14} className="animate-spin text-gray-400" />}
            {saveStatus === 'saved' && <Check size={14} className="text-emerald-500" />}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 max-w-6xl mx-auto w-full flex flex-col lg:flex-row gap-0 lg:gap-6 px-4 py-4">
        {/* Left: editor */}
        <div className="flex-1 space-y-3 min-w-0">
          {config.map((el, idx) => (
            <ElementoCard key={el.id} el={el} index={idx} total={config.length}
              onChange={(u) => updateElemento(idx, u)} onDelete={() => deleteElemento(idx)}
              onMoveUp={() => moveElemento(idx, idx - 1)} onMoveDown={() => moveElemento(idx, idx + 1)} />
          ))}

          <div className="flex flex-wrap gap-2 pt-2">
            <button type="button" onClick={() => addElemento('barra')}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-600 hover:bg-blue-100 transition-colors">
              <Plus size={13} /> Barra appenderia
            </button>
            <button type="button" onClick={() => addElemento('mensola')}
              className="flex items-center gap-1.5 px-4 py-2 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 hover:bg-amber-100 transition-colors">
              <Plus size={13} /> Mensola (standalone)
            </button>
            <button type="button" onClick={() => addElemento('frontale')}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 hover:bg-emerald-100 transition-colors">
              <Plus size={13} /> Frontale (standalone)
            </button>
          </div>

          {config.length === 0 && (
            <div className="py-10 text-center">
              <p className="text-sm text-gray-400">Costruisci il tuo layout</p>
              <p className="text-xs mt-1 text-gray-300">Aggiungi barre appenderia, mensole ed esposizioni frontali</p>
            </div>
          )}
        </div>

        {/* Right: preview */}
        <div className="lg:w-80 xl:w-96 flex-shrink-0">
          <div className="sticky top-24">
            <p className="text-xs text-gray-400 uppercase tracking-widest mb-3 font-medium">Anteprima Visual</p>
            <div className="bg-white border border-gray-200 rounded-2xl min-h-64 max-h-[70vh] overflow-hidden shadow-sm">
              <WallRenderer config={config} />
            </div>
            <p className="text-2xs text-gray-300 mt-2 text-center">Schema schematico dell'esposizione</p>
          </div>
        </div>
      </div>
    </div>
  );
}
