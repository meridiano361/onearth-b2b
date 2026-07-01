'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Plus, X, Search, Loader2, ChevronUp, ChevronDown,
  Trash2, GripVertical, Edit2, Check, Tag,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { PareteAttrezzata, ElementoParete, ItemParete, TipoCapo, TipoElementoParete, DimensioneMensola } from '@/types';
import type { Product } from '@/types';
import { MODA_COLLEZIONE } from '@/lib/modaAccess';
import { nanoid } from 'nanoid';

// ─── Helpers ────────────────────────────────────────────────────────────────

function colorForTipo(tipo: TipoCapo): string {
  const map: Record<TipoCapo, string> = {
    top: '#4f7c9c', bottom: '#6b5a8c', abito: '#8c5a7c',
    capospalla: '#4a6b4a', borsa: '#8c7a4a', accessorio: '#8c6a4a', altro: '#555',
  };
  return map[tipo] ?? '#555';
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

// ─── Product picker modal ────────────────────────────────────────────────────

function ProductPickerModal({
  onSelect,
  onClose,
}: {
  onSelect: (p: Product) => void;
  onClose: () => void;
}) {
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
    return products.filter((p) => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q)).slice(0, 80);
  }, [products, search]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-[#111] border border-white/10 rounded-t-2xl sm:rounded-2xl flex flex-col max-h-[80vh]">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
          <p className="flex-1 text-sm font-medium text-white">Seleziona prodotto PE27</p>
          <button onClick={onClose} className="text-white/40 hover:text-white/70"><X size={18} /></button>
        </div>
        <div className="px-4 py-3 border-b border-white/10">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cerca per nome o codice…"
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/30"
            />
          </div>
        </div>
        <div className="overflow-y-auto flex-1">
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-white/30" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-center py-8 text-xs text-white/25">Nessun risultato</p>
          ) : (
            filtered.map((p) => (
              <button
                key={p.id}
                onClick={() => { onSelect(p); onClose(); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors text-left"
              >
                {p.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.imageUrl} alt={p.name} className="w-8 h-8 object-cover rounded" />
                ) : (
                  <div className="w-8 h-8 bg-white/5 rounded" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white truncate">{p.name}</p>
                  <p className="text-2xs text-white/30 font-mono">{p.code}</p>
                </div>
              </button>
            ))
          )}
        </div>
        <div className="px-4 py-3 border-t border-white/10">
          <button
            onClick={onClose}
            className="w-full text-xs text-white/40 hover:text-white/60 transition-colors"
          >
            Senza prodotto collegato — prosegui manualmente
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Item card (within a barra/mensola/frontale) ─────────────────────────────

function ItemCard({
  item,
  tipoOptions,
  onChange,
  onDelete,
  onMoveLeft,
  onMoveRight,
  canMoveLeft,
  canMoveRight,
}: {
  item: ItemParete;
  tipoOptions: TipoCapo[];
  onChange: (updated: ItemParete) => void;
  onDelete: () => void;
  onMoveLeft?: () => void;
  onMoveRight?: () => void;
  canMoveLeft?: boolean;
  canMoveRight?: boolean;
}) {
  const [showProductPicker, setShowProductPicker] = useState(false);
  const taglieSuggested = item.tipo === 'borsa' || item.tipo === 'accessorio' ? TAGLIE_BORSE : TAGLIE_ABBIGLIAMENTO;
  const activeTaglie = new Set(item.pezzi.map((p) => p.taglia));

  function toggleTaglia(t: string) {
    if (activeTaglie.has(t)) {
      onChange({ ...item, pezzi: item.pezzi.filter((p) => p.taglia !== t) });
    } else {
      onChange({ ...item, pezzi: [...item.pezzi, { taglia: t }] });
    }
  }

  function addCustomTaglia(t: string) {
    if (!t.trim() || activeTaglie.has(t.trim().toUpperCase())) return;
    onChange({ ...item, pezzi: [...item.pezzi, { taglia: t.trim().toUpperCase() }] });
  }

  return (
    <div className="bg-white/[0.04] border border-white/10 rounded-xl p-3 space-y-2.5">
      {/* Row 1: tipo + product + move + delete */}
      <div className="flex items-start gap-2">
        <div
          className="w-2.5 h-10 rounded-sm flex-shrink-0 mt-0.5"
          style={{ backgroundColor: item.coloreHex ?? colorForTipo(item.tipo) }}
        />
        <div className="flex-1 min-w-0 space-y-1.5">
          {/* Tipo selector */}
          <div className="flex flex-wrap gap-1">
            {tipoOptions.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => onChange({ ...item, tipo: t })}
                className={`px-2 py-0.5 rounded-full text-2xs font-medium transition-colors ${
                  item.tipo === t
                    ? 'bg-white text-black'
                    : 'text-white/40 border border-white/10 hover:border-white/30'
                }`}
              >
                {TIPO_LABELS[t]}
              </button>
            ))}
          </div>
          {/* Product */}
          <button
            type="button"
            onClick={() => setShowProductPicker(true)}
            className="flex items-center gap-1.5 text-2xs text-white/30 hover:text-white/60 transition-colors"
          >
            <Tag size={10} />
            {item.productCode
              ? <span className="font-mono text-white/50">{item.productCode} — {item.productName}</span>
              : <span>Collega prodotto</span>}
          </button>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          {onMoveLeft && (
            <button type="button" onClick={onMoveLeft} disabled={!canMoveLeft} className="w-6 h-6 flex items-center justify-center text-white/25 hover:text-white/60 disabled:opacity-20 transition-colors">
              <ChevronUp size={14} />
            </button>
          )}
          {onMoveRight && (
            <button type="button" onClick={onMoveRight} disabled={!canMoveRight} className="w-6 h-6 flex items-center justify-center text-white/25 hover:text-white/60 disabled:opacity-20 transition-colors">
              <ChevronDown size={14} />
            </button>
          )}
          <button type="button" onClick={onDelete} className="w-6 h-6 flex items-center justify-center text-white/25 hover:text-red-400 transition-colors">
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Color hex */}
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={item.coloreHex ?? colorForTipo(item.tipo)}
          onChange={(e) => onChange({ ...item, coloreHex: e.target.value })}
          className="w-6 h-6 rounded border border-white/10 cursor-pointer bg-transparent p-0"
          title="Colore capo"
        />
        <span className="text-2xs text-white/20">Colore nell'esposizione</span>
      </div>

      {/* Taglie */}
      <div>
        <p className="text-2xs text-white/30 mb-1.5">Taglie disponibili <span className="text-white/20">({item.pezzi.length} pz)</span></p>
        <div className="flex flex-wrap gap-1">
          {taglieSuggested.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => toggleTaglia(t)}
              className={`px-2 py-0.5 rounded text-2xs font-mono transition-colors ${
                activeTaglie.has(t)
                  ? 'bg-white/20 text-white border border-white/20'
                  : 'text-white/25 border border-white/8 hover:border-white/20'
              }`}
            >
              {t}
            </button>
          ))}
          <CustomTagliaInput onAdd={addCustomTaglia} />
        </div>
      </div>

      {showProductPicker && (
        <ProductPickerModal
          onSelect={(p) => onChange({
            ...item,
            productId: p.id,
            productCode: p.code,
            productName: p.name,
            imageUrl: p.imageUrl ?? undefined,
          })}
          onClose={() => setShowProductPicker(false)}
        />
      )}
    </div>
  );
}

function CustomTagliaInput({ onAdd }: { onAdd: (t: string) => void }) {
  const [value, setValue] = useState('');
  const [editing, setEditing] = useState(false);
  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="px-2 py-0.5 rounded text-2xs text-white/20 border border-dashed border-white/10 hover:border-white/30 transition-colors"
      >
        + altra
      </button>
    );
  }
  return (
    <input
      autoFocus
      value={value}
      onChange={(e) => setValue(e.target.value.toUpperCase())}
      onKeyDown={(e) => {
        if (e.key === 'Enter') { onAdd(value); setValue(''); setEditing(false); }
        if (e.key === 'Escape') { setValue(''); setEditing(false); }
      }}
      onBlur={() => { if (value) onAdd(value); setValue(''); setEditing(false); }}
      placeholder="44…"
      className="w-14 px-2 py-0.5 rounded text-2xs font-mono text-white bg-white/5 border border-white/20 focus:outline-none"
    />
  );
}

// ─── Elemento card ────────────────────────────────────────────────────────────

function ElementoCard({
  el,
  index,
  total,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  el: ElementoParete;
  index: number;
  total: number;
  onChange: (updated: ElementoParete) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const [expanded, setExpanded] = useState(true);

  const tipoOptions =
    el.tipo === 'barra' ? TIPO_OPTIONS_BARRA :
    el.tipo === 'mensola' ? TIPO_OPTIONS_MENSOLA :
    TIPO_OPTIONS_FRONTALE;

  function addItem() {
    const defaultTipo: TipoCapo = el.tipo === 'mensola' ? 'borsa' : el.tipo === 'frontale' ? 'abito' : 'top';
    const newItem: ItemParete = {
      id: nanoid(8),
      tipo: defaultTipo,
      pezzi: [],
    };
    onChange({ ...el, items: [...el.items, newItem] });
  }

  function updateItem(idx: number, updated: ItemParete) {
    const items = [...el.items];
    items[idx] = updated;
    onChange({ ...el, items });
  }

  function removeItem(idx: number) {
    onChange({ ...el, items: el.items.filter((_, i) => i !== idx) });
  }

  function moveItem(from: number, to: number) {
    const items = [...el.items];
    const [moved] = items.splice(from, 1);
    items.splice(to, 0, moved);
    onChange({ ...el, items });
  }

  const elLabel =
    el.tipo === 'barra' ? 'Barra appenderia' :
    el.tipo === 'mensola' ? `Mensola ${el.dimensione ?? ''}` :
    'Esposizione frontale';

  const totalPezzi = el.items.reduce((acc, it) => acc + it.pezzi.length, 0);

  return (
    <div className="border border-white/10 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-white/[0.03]">
        <div className="flex flex-col gap-0.5">
          <button type="button" onClick={onMoveUp} disabled={index === 0} className="text-white/20 hover:text-white/50 disabled:opacity-20 transition-colors"><ChevronUp size={14} /></button>
          <button type="button" onClick={onMoveDown} disabled={index === total - 1} className="text-white/20 hover:text-white/50 disabled:opacity-20 transition-colors"><ChevronDown size={14} /></button>
        </div>
        <div
          className={`w-2 h-2 rounded-full flex-shrink-0 ${
            el.tipo === 'barra' ? 'bg-blue-400/60' :
            el.tipo === 'mensola' ? 'bg-amber-400/60' :
            'bg-emerald-400/60'
          }`}
        />
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex-1 text-left"
        >
          <p className="text-sm font-medium text-white">{elLabel}</p>
          <p className="text-xs text-white/30">
            {el.items.length} {el.tipo === 'frontale' ? 'capo' : 'capi'}{el.items.length !== 1 ? '' : ''}
            {totalPezzi > 0 && ` · ${totalPezzi} pz totali`}
          </p>
        </button>
        {el.tipo === 'mensola' && (
          <div className="flex gap-1">
            {(['piccola', 'media', 'lunga'] as DimensioneMensola[]).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => onChange({ ...el, dimensione: d })}
                className={`px-2 py-0.5 text-2xs rounded-full transition-colors ${
                  el.dimensione === d
                    ? 'bg-white/20 text-white'
                    : 'text-white/30 border border-white/10 hover:border-white/30'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        )}
        <button type="button" onClick={onDelete} className="text-white/20 hover:text-red-400 transition-colors ml-1">
          <Trash2 size={14} />
        </button>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 py-3 space-y-2">
          {el.items.map((item, idx) => (
            <ItemCard
              key={item.id}
              item={item}
              tipoOptions={tipoOptions}
              onChange={(updated) => updateItem(idx, updated)}
              onDelete={() => removeItem(idx)}
              onMoveLeft={el.tipo !== 'frontale' ? () => moveItem(idx, idx - 1) : undefined}
              onMoveRight={el.tipo !== 'frontale' ? () => moveItem(idx, idx + 1) : undefined}
              canMoveLeft={idx > 0}
              canMoveRight={idx < el.items.length - 1}
            />
          ))}
          {(el.tipo !== 'frontale' || el.items.length === 0) && (
            <button
              type="button"
              onClick={addItem}
              className="w-full py-2 border border-dashed border-white/15 rounded-xl text-xs text-white/30 hover:border-white/30 hover:text-white/50 transition-colors flex items-center justify-center gap-1.5"
            >
              <Plus size={13} />
              {el.tipo === 'barra' ? 'Aggiungi capo alla barra' :
               el.tipo === 'mensola' ? 'Aggiungi elemento alla mensola' :
               'Seleziona capo frontale'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Wall renderer (visual) ──────────────────────────────────────────────────

function WallRenderer({ config }: { config: ElementoParete[] }) {
  if (config.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-white/15">
        <p className="text-xs">Nessun elemento — aggiungi barre, mensole o frontali</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto space-y-2 p-4">
      {config.map((el) => (
        <WallElementRenderer key={el.id} el={el} />
      ))}
    </div>
  );
}

function WallElementRenderer({ el }: { el: ElementoParete }) {
  if (el.tipo === 'barra') {
    return (
      <div className="space-y-1">
        <div className="h-0.5 bg-white/30 w-full rounded" />
        <div className="flex gap-1.5 flex-wrap">
          {el.items.length === 0 ? (
            <p className="text-2xs text-white/15 italic">barra vuota</p>
          ) : el.items.map((it, i) => (
            <CapoOnBarra key={it.id ?? i} item={it} />
          ))}
        </div>
        <p className="text-2xs text-white/20 font-mono pl-0.5">barra appenderia</p>
      </div>
    );
  }

  if (el.tipo === 'mensola') {
    const w = el.dimensione === 'piccola' ? 'w-1/3' : el.dimensione === 'media' ? 'w-2/3' : 'w-full';
    return (
      <div className="space-y-1">
        <div className="flex items-end gap-1.5 flex-wrap min-h-[36px]">
          {el.items.length === 0 ? (
            <p className="text-2xs text-white/15 italic">mensola vuota</p>
          ) : el.items.map((it, i) => (
            <CapoOnMensola key={it.id ?? i} item={it} />
          ))}
        </div>
        <div className={`h-0.5 bg-white/20 rounded ${w}`} />
        <p className="text-2xs text-white/20 font-mono pl-0.5">mensola {el.dimensione ?? ''}</p>
      </div>
    );
  }

  if (el.tipo === 'frontale') {
    const it = el.items[0];
    return (
      <div className="flex gap-3 items-start">
        <div
          className="w-14 h-20 rounded border border-white/10 flex-shrink-0 flex items-end justify-center pb-1"
          style={{ backgroundColor: it?.coloreHex ?? '#333' }}
        >
          {it && (
            <span className="text-2xs text-white/60 font-mono">
              {TIPO_LABELS[it.tipo]?.[0] ?? '?'}
            </span>
          )}
        </div>
        <div>
          <p className="text-xs text-white/50 font-medium">{it?.productCode ?? '—'}</p>
          <p className="text-2xs text-white/25">{it?.productName ?? 'esposizione frontale'}</p>
          {it && it.pezzi.length > 0 && (
            <div className="flex gap-1 mt-1 flex-wrap">
              {it.pezzi.map((p, i) => (
                <span key={i} className="text-2xs bg-white/10 text-white/50 px-1.5 py-0.5 rounded font-mono">{p.taglia}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}

function CapoOnBarra({ item }: { item: ItemParete }) {
  return (
    <div className="flex flex-col items-center gap-0.5" title={`${TIPO_LABELS[item.tipo]}${item.productCode ? ` — ${item.productCode}` : ''}`}>
      {/* hanger dot */}
      <div className="w-1 h-1 bg-white/30 rounded-full" />
      {/* garment */}
      <div
        className="rounded-sm flex items-center justify-center"
        style={{
          backgroundColor: item.coloreHex ?? colorForTipo(item.tipo),
          width: item.tipo === 'capospalla' ? 28 : item.tipo === 'abito' ? 18 : 20,
          height: item.tipo === 'abito' ? 44 : item.tipo === 'capospalla' ? 32 : 28,
        }}
      >
        <span className="text-2xs text-white/70 font-bold select-none" style={{ fontSize: 8 }}>
          {TIPO_LABELS[item.tipo][0]}
        </span>
      </div>
      {/* pezzi count */}
      {item.pezzi.length > 0 && (
        <span className="text-2xs text-white/25" style={{ fontSize: 8 }}>{item.pezzi.length}pz</span>
      )}
    </div>
  );
}

function CapoOnMensola({ item }: { item: ItemParete }) {
  return (
    <div
      className="rounded-sm flex items-center justify-center flex-shrink-0"
      style={{
        backgroundColor: item.coloreHex ?? colorForTipo(item.tipo),
        width: item.tipo === 'borsa' ? 32 : 24,
        height: item.tipo === 'borsa' ? 28 : 20,
      }}
      title={`${TIPO_LABELS[item.tipo]}${item.productCode ? ` — ${item.productCode}` : ''} (${item.pezzi.length}pz)`}
    >
      <span className="text-2xs text-white/70 font-bold select-none" style={{ fontSize: 8 }}>
        {TIPO_LABELS[item.tipo][0]}
      </span>
    </div>
  );
}

// ─── Main editor ─────────────────────────────────────────────────────────────

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
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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
    if (nome.trim() && nome !== parete?.nome) {
      saveConfig(config, nome.trim());
    }
  }

  function addElemento(tipo: TipoElementoParete) {
    const newEl: ElementoParete = {
      id: nanoid(8),
      tipo,
      dimensione: tipo === 'mensola' ? 'media' : undefined,
      items: [],
    };
    handleConfigChange([...config, newEl]);
  }

  function updateElemento(idx: number, updated: ElementoParete) {
    const next = [...config];
    next[idx] = updated;
    handleConfigChange(next);
  }

  function deleteElemento(idx: number) {
    handleConfigChange(config.filter((_, i) => i !== idx));
  }

  function moveElemento(from: number, to: number) {
    const next = [...config];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    handleConfigChange(next);
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-white/30" />
      </div>
    );
  }

  if (isError || !parete) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <p className="text-sm text-white/40">Parete non trovata</p>
      </div>
    );
  }

  const totalCapi = config.reduce((acc, el) => acc + el.items.length, 0);
  const totalPezzi = config.reduce((acc, el) => acc + el.items.reduce((a, it) => a + it.pezzi.length, 0), 0);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#0a0a0a]/95 backdrop-blur border-b border-white/5 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <button onClick={() => router.push('/moda/pareti')} className="text-white/40 hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1 min-w-0">
            {editingNome ? (
              <input
                autoFocus
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                onBlur={handleNomeSave}
                onKeyDown={(e) => { if (e.key === 'Enter') handleNomeSave(); if (e.key === 'Escape') { setNome(parete.nome); setEditingNome(false); } }}
                className="bg-transparent border-b border-white/30 text-base font-semibold text-white focus:outline-none w-full"
              />
            ) : (
              <button type="button" onClick={() => setEditingNome(true)} className="flex items-center gap-1.5 group">
                <h1 className="text-base font-semibold truncate">{nome}</h1>
                <Edit2 size={12} className="text-white/20 group-hover:text-white/50 transition-colors flex-shrink-0" />
              </button>
            )}
            <p className="text-xs text-white/25">
              {config.length} elementi · {totalCapi} capi · {totalPezzi} pz
            </p>
          </div>
          <div className="flex-shrink-0">
            {saveStatus === 'saving' && <Loader2 size={14} className="animate-spin text-white/30" />}
            {saveStatus === 'saved' && <Check size={14} className="text-emerald-400" />}
          </div>
        </div>
      </div>

      {/* Body: two columns on lg */}
      <div className="flex-1 max-w-6xl mx-auto w-full flex flex-col lg:flex-row gap-0 lg:gap-6 px-4 py-4">
        {/* Left: editor */}
        <div className="flex-1 space-y-3 min-w-0">
          {config.map((el, idx) => (
            <ElementoCard
              key={el.id}
              el={el}
              index={idx}
              total={config.length}
              onChange={(updated) => updateElemento(idx, updated)}
              onDelete={() => deleteElemento(idx)}
              onMoveUp={() => moveElemento(idx, idx - 1)}
              onMoveDown={() => moveElemento(idx, idx + 1)}
            />
          ))}

          {/* Add element buttons */}
          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="button"
              onClick={() => addElemento('barra')}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-500/10 border border-blue-400/20 rounded-xl text-xs text-blue-300 hover:bg-blue-500/20 transition-colors"
            >
              <Plus size={13} /> Barra appenderia
            </button>
            <button
              type="button"
              onClick={() => addElemento('mensola')}
              className="flex items-center gap-1.5 px-4 py-2 bg-amber-500/10 border border-amber-400/20 rounded-xl text-xs text-amber-300 hover:bg-amber-500/20 transition-colors"
            >
              <Plus size={13} /> Mensola
            </button>
            <button
              type="button"
              onClick={() => addElemento('frontale')}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500/10 border border-emerald-400/20 rounded-xl text-xs text-emerald-300 hover:bg-emerald-500/20 transition-colors"
            >
              <Plus size={13} /> Frontale
            </button>
          </div>

          {config.length === 0 && (
            <div className="py-10 text-center text-white/20">
              <p className="text-sm">Costruisci la tua parete attrezzata</p>
              <p className="text-xs mt-1">Aggiungi barre appenderia, mensole ed esposizioni frontali</p>
            </div>
          )}
        </div>

        {/* Right: visual preview */}
        <div className="lg:w-80 xl:w-96 flex-shrink-0">
          <div className="sticky top-24">
            <p className="text-xs text-white/30 uppercase tracking-widest mb-3 font-medium">Anteprima parete</p>
            <div className="bg-white/[0.02] border border-white/8 rounded-2xl min-h-64 max-h-[70vh] overflow-hidden">
              <WallRenderer config={config} />
            </div>
            <p className="text-2xs text-white/15 mt-2 text-center">Schema schematico dell'esposizione</p>
          </div>
        </div>
      </div>
    </div>
  );
}
