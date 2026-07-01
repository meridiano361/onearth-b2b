'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Plus, X, Search, Loader2, ChevronLeft, ChevronRight,
  Trash2, Edit2, Check, Tag, PackagePlus, AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type {
  PareteAttrezzata, ElementoParete, ItemParete,
  TipoCapo, TipoElementoParete, DimensioneMensola, DimensioneBarra,
  MensolaInlineConfig, PosizioneMensola,
} from '@/types';
import type { Product } from '@/types';
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

// Visual proportions: 1 frontale = 1 mensola piccola = UNIT px; 5 capi di costa = 1 UNIT
const UNIT = 60;
const COSTA_W = 12;
const FRONTALE_H = 90;
const FRONTALE_TOP_H = 36;
const FRONTALE_BOT_H = 54;
const STRATO_H = 5;   // height of one folded garment layer on mensola
const MENSOLA_W: Record<DimensioneMensola, number> = { piccola: UNIT, media: UNIT * 2, lunga: UNIT * 3 };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function totalePezzi(items: ItemParete[]): number {
  return items.reduce((acc, it) => acc + it.pezzi.length, 0);
}

function hexFromProduct(p: Product): string | undefined {
  return p.pantoneColors?.find((pc) => pc.isPrimary)?.hex_code ?? p.pantoneColors?.[0]?.hex_code;
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
    queryKey: ['moda-products-visual'],
    queryFn: () => fetch(`/api/products?active=true&gruppoMerceologico=Moda&limit=500`).then((r) => r.json()),
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
      imageUrl: p.imageUrl ?? undefined,
      coloreHex: hexFromProduct(p),
      pezzi: [],
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
    queryKey: ['moda-products-visual'],
    queryFn: () => fetch(`/api/products?active=true&gruppoMerceologico=Moda&limit=500`).then((r) => r.json()),
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
          {onMoveLeft && <button type="button" onClick={onMoveLeft} disabled={!canMoveLeft} className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-gray-600 disabled:opacity-20 transition-colors"><ChevronLeft size={14} /></button>}
          {onMoveRight && <button type="button" onClick={onMoveRight} disabled={!canMoveRight} className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-gray-600 disabled:opacity-20 transition-colors"><ChevronRight size={14} /></button>}
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
          onSelect={(p) => onChange({ ...item, productId: p.id, productCode: p.code, productName: p.name, imageUrl: p.imageUrl ?? undefined, coloreHex: hexFromProduct(p) ?? item.coloreHex })}
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
          onSelect={(p) => onChange({ ...item, productId: p.id, productCode: p.code, productName: p.name, imageUrl: p.imageUrl ?? undefined, coloreHex: hexFromProduct(p) ?? item.coloreHex })}
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
      <div className="flex items-center gap-2 flex-wrap">
        <div className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
        <p className="text-xs font-medium text-amber-800">Mensola</p>
        {/* dimensione */}
        <div className="flex gap-1">
          {MENSOLA_DIMS.map((d) => (
            <button key={d} type="button" onClick={() => onChange({ ...config, dimensione: d })}
              className={`px-2 py-0.5 text-2xs rounded-full transition-colors ${config.dimensione === d ? 'bg-amber-400 text-white' : 'text-amber-600 border border-amber-200 hover:bg-amber-100'}`}>
              {d}
            </button>
          ))}
        </div>
        {/* posizione */}
        <div className="flex gap-1">
          {(['sopra', 'sotto', 'fianco'] as PosizioneMensola[]).map((p) => (
            <button key={p} type="button" onClick={() => onChange({ ...config, posizione: p })}
              className={`px-2 py-0.5 text-2xs rounded-full transition-colors ${(config.posizione ?? 'sopra') === p ? 'bg-amber-600 text-white' : 'text-amber-600 border border-amber-200 hover:bg-amber-100'}`}>
              {p}
            </button>
          ))}
        </div>
        {/* offset */}
        <div className="flex gap-0.5 ml-auto">
          <button type="button" onClick={() => onChange({ ...config, offsetX: Math.max(0, (config.offsetX ?? 0) - COSTA_W) })}
            className="w-5 h-5 flex items-center justify-center text-amber-400 hover:text-amber-700 disabled:opacity-20 transition-colors"
            disabled={(config.offsetX ?? 0) === 0}><ChevronLeft size={11} /></button>
          <button type="button" onClick={() => onChange({ ...config, offsetX: (config.offsetX ?? 0) + COSTA_W })}
            className="w-5 h-5 flex items-center justify-center text-amber-400 hover:text-amber-700 transition-colors"><ChevronRight size={11} /></button>
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
      <button type="button" onClick={() => setShowCatalog(true)}
        className="w-full py-1.5 bg-white border border-amber-200 rounded-lg text-2xs text-amber-700 hover:bg-amber-50 transition-colors flex items-center justify-center gap-1 font-medium">
        <PackagePlus size={11} /> Importa dal catalogo
      </button>
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

  const elLabel = isBarra ? 'Barra' : isMensola ? 'Mensola' : 'Frontale';
  const totalPz = totalePezzi(el.items);

  return (
    <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-gray-50">
        <div className="flex gap-0.5">
          <button type="button" onClick={onMoveUp} disabled={index === 0} className="text-gray-300 hover:text-gray-600 disabled:opacity-20 transition-colors" title="Sposta a sinistra"><ChevronLeft size={14} /></button>
          <button type="button" onClick={onMoveDown} disabled={index === total - 1} className="text-gray-300 hover:text-gray-600 disabled:opacity-20 transition-colors" title="Sposta a destra"><ChevronRight size={14} /></button>
        </div>
        <button type="button" onClick={() => setExpanded(!expanded)} className="flex items-center gap-2 flex-1 min-w-0 text-left">
          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-gray-900 text-white flex-shrink-0">{elLabel}</span>
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

            {(!isFrontale ? true : el.items.length < 2) && (
              <button type="button" onClick={() => setShowCatalogPicker(true)}
                className="w-full py-2 bg-primary/5 border border-primary/20 rounded-xl text-xs text-primary hover:bg-primary/10 transition-colors flex items-center justify-center gap-1.5 font-medium">
                <PackagePlus size={13} />
                {isFrontale && el.items.length === 1 ? 'Aggiungi secondo capo' : 'Importa dal catalogo'}
              </button>
            )}
          </div>

          {/* Horizontal offset — barra and frontale */}
          {(isBarra || isFrontale) && (
            <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
              <p className="text-2xs text-gray-400 flex-1">Posizione</p>
              <button type="button"
                onClick={() => onChange({ ...el, offsetX: Math.max(0, (el.offsetX ?? 0) - COSTA_W) })}
                disabled={(el.offsetX ?? 0) === 0}
                className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-gray-600 disabled:opacity-20 transition-colors">
                <ChevronLeft size={14} />
              </button>
              <button type="button"
                onClick={() => onChange({ ...el, offsetX: (el.offsetX ?? 0) + COSTA_W })}
                className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-gray-600 transition-colors">
                <ChevronRight size={14} />
              </button>
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

function WallRenderer({ config, onReorder }: { config: ElementoParete[]; onReorder: (c: ElementoParete[]) => void }) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);

  if (config.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-300 p-4">
        <p className="text-xs text-center">Aggiungi barre, mensole o frontali</p>
      </div>
    );
  }

  function handleDrop(e: React.DragEvent, targetIdx: number) {
    e.preventDefault();
    const srcIdx = config.findIndex((x) => x.id === draggingId);
    if (srcIdx !== -1 && srcIdx !== targetIdx) {
      const next = [...config];
      const [moved] = next.splice(srcIdx, 1);
      next.splice(targetIdx, 0, moved);
      onReorder(next);
    }
    setDraggingId(null);
    setOverIdx(null);
  }

  return (
    <div className="overflow-x-auto p-4 h-full">
      <div className="flex items-end gap-3" style={{ minHeight: 200 }}>
        {config.map((el, idx) => (
          <div
            key={el.id}
            draggable
            onDragStart={(e) => { setDraggingId(el.id); e.dataTransfer.effectAllowed = 'move'; }}
            onDragOver={(e) => { e.preventDefault(); setOverIdx(idx); }}
            onDrop={(e) => handleDrop(e, idx)}
            onDragEnd={() => { setDraggingId(null); setOverIdx(null); }}
            className={[
              'cursor-grab active:cursor-grabbing select-none transition-opacity',
              draggingId === el.id ? 'opacity-30' : 'opacity-100',
              overIdx === idx && draggingId !== el.id ? 'outline outline-2 outline-primary outline-offset-2 rounded' : '',
            ].join(' ')}
          >
            <WallElementRenderer el={el} />
          </div>
        ))}
      </div>
    </div>
  );
}

function MensolaBlock({ config }: { config: MensolaInlineConfig }) {
  return (
    <div style={{ marginLeft: config.offsetX ?? 0 }}>
      <MensolaRenderer config={config} />
    </div>
  );
}

function WallElementRenderer({ el }: { el: ElementoParete }) {
  const pos = el.mensolaTop?.posizione ?? 'sopra';

  if (el.tipo === 'barra') {
    const dim = (el.dimensione ?? 'media') as DimensioneBarra;
    const pzTot = totalePezzi(el.items);
    const max = BARRA_MAX_PZ[dim];
    const over = pzTot > max;

    const barraCore = (
      <div style={{ marginLeft: el.offsetX ?? 0 }}>
        <div className={`h-0.5 rounded ${over ? 'bg-red-400' : 'bg-gray-400'}`} style={{ minWidth: UNIT }} />
        <div className="flex items-start" style={{ gap: 1, minHeight: 48, minWidth: UNIT }}>
          {el.items.length === 0
            ? <div style={{ minWidth: UNIT }} />
            : el.items.map((it, i) => <CapoOnBarra key={it.id ?? i} item={it} />)}
        </div>
      </div>
    );

    if (!el.mensolaTop) return <div className="flex-shrink-0">{barraCore}</div>;

    if (pos === 'sopra') return (
      <div className="flex flex-col items-start flex-shrink-0">
        <MensolaBlock config={el.mensolaTop} />
        <div style={{ marginTop: 12 }}>{barraCore}</div>
      </div>
    );
    if (pos === 'sotto') return (
      <div className="flex flex-col items-start flex-shrink-0">
        {barraCore}
        <div style={{ marginTop: 12 }}><MensolaBlock config={el.mensolaTop} /></div>
      </div>
    );
    // fianco — mensola centrata verticalmente accanto alla barra
    return (
      <div className="flex items-center gap-2 flex-shrink-0">
        {barraCore}
        <MensolaBlock config={el.mensolaTop} />
      </div>
    );
  }

  if (el.tipo === 'mensola') {
    return (
      <div className="flex-shrink-0">
        <MensolaRenderer config={{ dimensione: (el.dimensione as DimensioneMensola) ?? 'media', items: el.items, posizione: 'sopra' }} />
      </div>
    );
  }

  if (el.tipo === 'frontale') {
    const item1 = el.items[0];
    const item2 = el.items[1];

    const frontaleCore = item2 ? (
      <div style={{ width: UNIT }}>
        <div className="rounded-t border border-b-0 border-gray-200"
          style={{ backgroundColor: item1?.coloreHex ?? '#e5e7eb', width: UNIT, height: FRONTALE_TOP_H }} />
        <div className="rounded-b border border-gray-200"
          style={{ backgroundColor: item2.coloreHex ?? '#e5e7eb', width: UNIT, height: FRONTALE_BOT_H }} />
      </div>
    ) : (
      <div className="rounded border border-gray-200"
        style={{ backgroundColor: item1?.coloreHex ?? '#e5e7eb', width: UNIT, height: FRONTALE_H }} />
    );

    const wrapper = (children: React.ReactNode) => (
      <div className="flex-shrink-0" style={{ marginLeft: el.offsetX ?? 0 }}>{children}</div>
    );

    if (!el.mensolaTop) return wrapper(frontaleCore);

    if (pos === 'sopra') return wrapper(
      <div className="flex flex-col items-start">
        <MensolaBlock config={el.mensolaTop} />
        <div style={{ marginTop: 12 }}>{frontaleCore}</div>
      </div>
    );
    if (pos === 'sotto') return wrapper(
      <div className="flex flex-col items-start">
        {frontaleCore}
        <div style={{ marginTop: 12 }}><MensolaBlock config={el.mensolaTop} /></div>
      </div>
    );
    return wrapper(
      <div className="flex items-center gap-2">
        {frontaleCore}
        <MensolaBlock config={el.mensolaTop} />
      </div>
    );
  }

  return null;
}

function MensolaRenderer({ config }: { config: MensolaInlineConfig }) {
  const w = MENSOLA_W[config.dimensione];
  return (
    <div>
      <div className="flex items-end gap-0.5" style={{ minWidth: w }}>
        {config.items.length === 0
          ? <div style={{ width: w, height: STRATO_H }} />
          : config.items.map((it, i) => {
              const color = it.coloreHex ?? colorForTipo(it.tipo);
              if (it.tipo === 'borsa') {
                return (
                  <div key={it.id ?? i} className="flex-shrink-0 rounded-sm"
                    style={{ backgroundColor: color, width: 36, height: 32 }}
                    title={`Borsa (${it.pezzi.length}pz)`} />
                );
              }
              if (it.tipo === 'accessorio') {
                return (
                  <div key={it.id ?? i} className="flex-shrink-0 rounded-sm"
                    style={{ backgroundColor: color, width: 22, height: 20 }}
                    title={`Accessorio (${it.pezzi.length}pz)`} />
                );
              }
              // Abbigliamento di costa: 1 strato per taglia
              const n = Math.max(1, it.pezzi.length);
              return (
                <div key={it.id ?? i} className="flex flex-col-reverse flex-shrink-0" style={{ width: 48 }}
                  title={`${TIPO_LABELS[it.tipo]} · ${n} strat${n === 1 ? 'o' : 'i'}`}>
                  {Array.from({ length: n }).map((_, j) => (
                    <div key={j} style={{ backgroundColor: color, height: STRATO_H, width: '100%' }} />
                  ))}
                </div>
              );
            })}
      </div>
      <div className="h-0.5 bg-gray-400 rounded" style={{ width: w }} />
    </div>
  );
}

function FrontaleSmall({ item }: { item: ItemParete }) {
  const color = item.coloreHex ?? colorForTipo(item.tipo);
  return (
    <div className="flex flex-col items-center gap-0.5 flex-shrink-0" title={`Frontale — ${TIPO_LABELS[item.tipo]}`}>
      <div className="rounded border border-gray-200 flex items-end justify-center pb-1"
        style={{ backgroundColor: color, width: UNIT, height: FRONTALE_H }}>
        {item.pezzi.length > 0 && <span className="text-white font-bold drop-shadow-sm" style={{ fontSize: 8 }}>{item.pezzi.length}pz</span>}
      </div>
    </div>
  );
}

function CapoOnBarra({ item }: { item: ItemParete }) {
  const color = item.coloreHex ?? colorForTipo(item.tipo);
  const h = item.tipo === 'abito' ? 72 : item.tipo === 'capospalla' ? 60 : 48;
  const count = Math.max(1, item.pezzi.length);
  return (
    <div className="flex flex-shrink-0" style={{ gap: 1 }}
      title={`${TIPO_LABELS[item.tipo]}${item.productCode ? ` — ${item.productCode}` : ''} · ${item.pezzi.length}pz`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col items-center" style={{ width: COSTA_W }}>
          <div className="w-1 h-1.5 bg-gray-400 rounded-full" />
          <div className="rounded-sm" style={{ backgroundColor: color, width: COSTA_W - 2, height: h }} />
        </div>
      ))}
    </div>
  );
}

function CapoOnMensola({ item }: { item: ItemParete }) {
  const color = item.coloreHex ?? colorForTipo(item.tipo);
  const w = item.tipo === 'borsa' ? 26 : 18;
  const h = item.tipo === 'borsa' ? 24 : 18;
  return (
    <div className="rounded-sm flex-shrink-0"
      style={{ backgroundColor: color, width: w, height: h }}
      title={`${TIPO_LABELS[item.tipo]} (${item.pezzi.length}pz)`} />
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
            {(['barra', 'mensola', 'frontale'] as const).map((tipo) => (
              <button key={tipo} type="button" onClick={() => addElemento(tipo)}
                className="flex items-center gap-1.5 px-4 py-2 bg-cream text-primary border border-border rounded-xl text-xs font-medium hover:bg-accent/10 active:bg-accent/20 transition-colors">
                <Plus size={13} /> {tipo.charAt(0).toUpperCase() + tipo.slice(1)}
              </button>
            ))}
          </div>

          {config.length === 0 && (
            <div className="py-10 text-center">
              <p className="text-sm text-gray-400">Costruisci il tuo layout</p>
              <p className="text-xs mt-1 text-gray-300">Aggiungi barre appenderia, mensole ed esposizioni frontali</p>
            </div>
          )}
        </div>

        {/* Right: preview — sticky full height, draggable reorder */}
        <div className="hidden lg:block lg:w-80 xl:w-96 flex-shrink-0">
          <div className="sticky top-[60px] flex flex-col" style={{ height: 'calc(100vh - 60px)' }}>
            <p className="text-xs text-gray-400 uppercase tracking-widest mb-2 font-medium flex-shrink-0">Anteprima parete</p>
            <p className="text-2xs text-gray-300 mb-3 flex-shrink-0">Trascina gli elementi per riordinarli</p>
            <div className="bg-white border border-gray-200 rounded-2xl flex-1 overflow-auto shadow-sm min-h-0">
              <WallRenderer config={config} onReorder={handleConfigChange} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
