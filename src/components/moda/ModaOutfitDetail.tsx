'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { ArrowLeft, Plus, X, Search, ShoppingBag, Loader2, Pencil, Check, Palette } from 'lucide-react';
import { ProductImage } from '@/components/ui/ProductImage';
import { useCartStore } from '@/store/cartStore';
import { formatCurrency } from '@/lib/utils';
import {
  ZONA_CONFIG,
  suggestZona,
  type ColorSwatch,
  type OutfitZona,
} from '@/lib/modaEsposizioneConfig';
import { MODA_COLLEZIONE } from '@/lib/modaAccess';
import toast from 'react-hot-toast';
import type { Product } from '@/types';

type OutfitProduct = {
  id: string; code: string; name: string;
  imageUrl: string | null; imageUrl2: string | null; imageUrl3: string | null;
  costPrice: number; retailPrice: number; lotSize: number; iva: number;
  colore: string | null; famiglia: string | null; sottofamiglia: string | null;
  classe: string | null; descrizione: string | null;
};

type OutfitItem = {
  id: string;
  ordine: number;
  zona: OutfitZona;
  note: string | null;
  product: OutfitProduct;
};

type Outfit = {
  id: string;
  titolo: string;
  descrizione: string | null;
  coloriGuida: ColorSwatch[];
  fantasia: string | null;
  imageUrl: string | null;
  items: OutfitItem[];
};

function ColorColumn({ swatches, fantasia }: { swatches: ColorSwatch[]; fantasia: string | null }) {
  return (
    <div className="flex flex-col gap-3">
      {swatches.length > 0 ? (
        <>
          <div className="rounded-2xl overflow-hidden border border-white/10" style={{ minHeight: 180 }}>
            {swatches.map((s, i) => (
              <div
                key={i}
                className="flex-1"
                style={{ backgroundColor: s.hex, height: `${100 / swatches.length}%`, minHeight: 40 }}
                title={s.label}
              />
            ))}
          </div>
          <div className="space-y-1.5">
            {swatches.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full flex-shrink-0 border border-white/10" style={{ backgroundColor: s.hex }} />
                <span className="text-xs text-white/50">{s.label}</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="h-32 rounded-2xl border border-dashed border-white/10 flex items-center justify-center">
          <Palette size={20} className="text-white/15" />
        </div>
      )}

      {fantasia && (
        <div className="mt-1 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10">
          <p className="text-2xs text-white/30 uppercase tracking-widest mb-0.5">Fantasia</p>
          <p className="text-xs text-white/70 italic">{fantasia}</p>
        </div>
      )}
    </div>
  );
}

function ZoneColumn({
  zona,
  items,
  outfitId,
  onRemove,
  onAddToCart,
}: {
  zona: OutfitZona;
  items: OutfitItem[];
  outfitId: string;
  onRemove: (productId: string) => void;
  onAddToCart: (item: OutfitItem) => void;
}) {
  const cfg = ZONA_CONFIG[zona];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline gap-2 mb-1">
        <p className="text-xs font-medium text-white/80">{cfg.label}</p>
        <span className="text-2xs text-white/30">({items.length})</span>
      </div>
      <p className="text-2xs text-white/25 -mt-2 mb-1">{cfg.sublabel}</p>

      {items.length === 0 ? (
        <div className="h-24 rounded-xl border border-dashed border-white/10 flex items-center justify-center">
          <p className="text-xs text-white/20">Vuoto</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="group relative flex gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:border-white/15 transition-colors">
              <Link href={`/catalog/${item.product.id}`} className="w-16 h-16 rounded-lg overflow-hidden bg-white/5 flex-shrink-0">
                <ProductImage src={item.product.imageUrl} alt={item.product.name} className="w-full h-full object-cover" />
              </Link>
              <div className="flex-1 min-w-0 pr-7">
                <p className="text-2xs font-mono text-white/30 leading-none">{item.product.code}</p>
                <Link href={`/catalog/${item.product.id}`} className="text-xs text-white hover:underline underline-offset-2 line-clamp-2 leading-snug mt-0.5 block">
                  {item.product.name}
                </Link>
                {item.product.colore && (
                  <p className="text-2xs text-white/30 mt-0.5">{item.product.colore}</p>
                )}
                <p className="text-xs text-white/50 mt-1">{formatCurrency(Number(item.product.costPrice))}</p>
              </div>

              <div className="absolute right-2 top-2 flex flex-col gap-1">
                <button
                  onClick={() => onAddToCart(item)}
                  className="w-7 h-7 bg-white/10 rounded-lg flex items-center justify-center text-white/50 hover:bg-white hover:text-black transition-all"
                  title="Aggiungi al carrello"
                >
                  <ShoppingBag size={12} />
                </button>
                <button
                  onClick={() => onRemove(item.product.id)}
                  className="w-7 h-7 bg-white/5 rounded-lg flex items-center justify-center text-white/20 hover:bg-red-500/20 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100"
                  title="Rimuovi dall'outfit"
                >
                  <X size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AddProductsPanel({
  outfitId,
  existingIds,
  onClose,
}: {
  outfitId: string;
  existingIds: Set<string>;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const [selectedZona, setSelectedZona] = useState<OutfitZona>('centro');
  const qc = useQueryClient();

  const { data } = useQuery<{ data: Product[] }>({
    queryKey: ['moda-products-panel'],
    queryFn: () => fetch(`/api/products?active=true&collezione=${MODA_COLLEZIONE}&limit=500`).then((r) => r.json()),
    staleTime: 60_000,
  });

  const products = data?.data ?? [];

  const filtered = useMemo(() => {
    if (!search.trim()) return products;
    const q = search.toLowerCase();
    return products.filter((p) => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q));
  }, [products, search]);

  const addMutation = useMutation({
    mutationFn: ({ productId, zona }: { productId: string; zona: OutfitZona }) =>
      fetch(`/api/moda/esposizione/${outfitId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, zona }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['moda-outfit', outfitId] }),
    onError: () => toast.error('Errore aggiunta prodotto'),
  });

  const removeMutation = useMutation({
    mutationFn: (productId: string) =>
      fetch(`/api/moda/esposizione/${outfitId}/items?productId=${productId}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['moda-outfit', outfitId] }),
    onError: () => toast.error('Errore rimozione'),
  });

  function handleToggle(product: Product) {
    if (existingIds.has(product.id)) {
      removeMutation.mutate(product.id);
    } else {
      const suggestedZona = suggestZona(product);
      addMutation.mutate({ productId: product.id, zona: selectedZona !== suggestedZona ? selectedZona : suggestedZona });
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-[#111] border border-white/10 rounded-t-2xl sm:rounded-2xl flex flex-col max-h-[85vh]">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10 flex-shrink-0">
          <p className="flex-1 text-sm font-medium text-white">Aggiungi prodotti PE27</p>
          <button onClick={onClose} className="text-white/40 hover:text-white/70"><X size={18} /></button>
        </div>

        <div className="px-4 py-3 border-b border-white/10 flex-shrink-0">
          <p className="text-2xs text-white/30 uppercase tracking-widest mb-2">Zona di destinazione</p>
          <div className="flex gap-2">
            {(['centro', 'destra'] as OutfitZona[]).map((z) => (
              <button
                key={z}
                onClick={() => setSelectedZona(z)}
                className={`flex-1 px-3 py-2 rounded-xl text-xs transition-colors ${
                  selectedZona === z ? 'bg-white text-black font-medium' : 'bg-white/10 text-white/60 hover:bg-white/15'
                }`}
              >
                {ZONA_CONFIG[z].label}
              </button>
            ))}
          </div>
          <p className="text-2xs text-white/25 mt-1.5 text-center">{ZONA_CONFIG[selectedZona].categoryHint}</p>
        </div>

        <div className="px-4 py-3 border-b border-white/10 flex-shrink-0">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cerca nome o codice…"
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-white/30"
              autoFocus
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-white/5">
          {filtered.map((p) => {
            const isIn = existingIds.has(p.id);
            const suggested = suggestZona(p);
            return (
              <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-white/5 flex-shrink-0">
                  <ProductImage src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-mono text-white/40">{p.code}</p>
                    <span className="text-2xs text-white/20 italic">{ZONA_CONFIG[suggested].label.split(' ')[0]}</span>
                  </div>
                  <p className="text-sm text-white truncate">{p.name}</p>
                  {p.colore && <p className="text-xs text-white/30">{p.colore}</p>}
                </div>
                <button
                  onClick={() => handleToggle(p)}
                  className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                    isIn
                      ? 'bg-white/10 text-white/60 hover:bg-red-500/20 hover:text-red-400'
                      : 'bg-white text-black hover:bg-white/80'
                  }`}
                >
                  {isIn ? <Check size={14} /> : <Plus size={14} />}
                </button>
              </div>
            );
          })}
        </div>

        <div className="px-4 py-4 border-t border-white/10 flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl border border-white/15 text-white/60 text-sm hover:border-white/25 transition-colors"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ModaOutfitDetail({ outfitId }: { outfitId: string }) {
  const qc = useQueryClient();
  const { addItem } = useCartStore();
  const [showAdd, setShowAdd] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState('');

  const { data, isLoading } = useQuery<{ data: Outfit }>({
    queryKey: ['moda-outfit', outfitId],
    queryFn: () => fetch(`/api/moda/esposizione/${outfitId}`).then((r) => r.json()),
    staleTime: 30_000,
  });

  const outfit = data?.data;

  const centroItems = useMemo(() => outfit?.items.filter((i) => i.zona === 'centro') ?? [], [outfit]);
  const destraItems = useMemo(() => outfit?.items.filter((i) => i.zona === 'destra') ?? [], [outfit]);

  const removeItem = useMutation({
    mutationFn: (productId: string) =>
      fetch(`/api/moda/esposizione/${outfitId}/items?productId=${productId}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['moda-outfit', outfitId] }),
    onError: () => toast.error('Errore rimozione'),
  });

  const updateTitle = useMutation({
    mutationFn: (titolo: string) =>
      fetch(`/api/moda/esposizione/${outfitId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titolo }),
      }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['moda-outfit', outfitId] }); setEditingTitle(false); },
    onError: () => toast.error('Errore salvataggio'),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 size={24} className="text-white/30 animate-spin" />
      </div>
    );
  }

  if (!outfit) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-white/40">
        <p className="text-sm">Outfit non trovato</p>
      </div>
    );
  }

  const existingIds = new Set(outfit.items.map((i) => i.product.id));
  const totalItems = outfit.items.length;

  function addToCart(items: OutfitItem[]) {
    items.forEach((item) => addItem(item.product as any, item.product.lotSize || 1));
    toast.success(`${items.length} prodott${items.length === 1 ? 'o aggiunto' : 'i aggiunti'} al carrello`);
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Color strip */}
      {outfit.coloriGuida.length > 0 && (
        <div className="flex h-1">
          {outfit.coloriGuida.map((s, i) => (
            <div key={i} className="flex-1" style={{ backgroundColor: s.hex }} />
          ))}
        </div>
      )}

      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#0a0a0a]/95 backdrop-blur-sm px-4 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <Link href="/moda/esposizione" className="text-white/40 hover:text-white/70 transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-white/40 uppercase tracking-widest">Esposizione PE27</p>
            {editingTitle ? (
              <div className="flex items-center gap-2 mt-0.5">
                <input
                  value={titleValue}
                  onChange={(e) => setTitleValue(e.target.value)}
                  className="flex-1 bg-transparent text-sm font-medium text-white border-b border-white/30 focus:outline-none"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') updateTitle.mutate(titleValue);
                    if (e.key === 'Escape') setEditingTitle(false);
                  }}
                />
                <button onClick={() => updateTitle.mutate(titleValue)} className="text-white/60 hover:text-white"><Check size={14} /></button>
                <button onClick={() => setEditingTitle(false)} className="text-white/40 hover:text-white/60"><X size={14} /></button>
              </div>
            ) : (
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-sm font-medium truncate">{outfit.titolo}</p>
                <button
                  onClick={() => { setTitleValue(outfit.titolo); setEditingTitle(true); }}
                  className="text-white/20 hover:text-white/50 transition-colors flex-shrink-0"
                >
                  <Pencil size={12} />
                </button>
              </div>
            )}
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-black text-xs font-medium rounded-lg hover:bg-white/90 transition-colors flex-shrink-0"
          >
            <Plus size={13} /> Prodotto
          </button>
        </div>
      </div>

      {outfit.descrizione && (
        <div className="px-4 pt-4 pb-0">
          <p className="text-sm text-white/40 italic">{outfit.descrizione}</p>
        </div>
      )}

      {/* Cart actions */}
      {totalItems > 0 && (
        <div className="px-4 py-3 flex gap-2 overflow-x-auto">
          <button
            onClick={() => addToCart(outfit.items)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-black text-xs font-medium flex-shrink-0 hover:bg-white/90 transition-colors"
          >
            <ShoppingBag size={12} /> Tutto ({totalItems})
          </button>
          {centroItems.length > 0 && (
            <button
              onClick={() => addToCart(centroItems)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 text-white/70 text-xs flex-shrink-0 hover:bg-white/15 transition-colors"
            >
              Solo capi ({centroItems.length})
            </button>
          )}
          {destraItems.length > 0 && (
            <button
              onClick={() => addToCart(destraItems)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 text-white/70 text-xs flex-shrink-0 hover:bg-white/15 transition-colors"
            >
              Solo accessori ({destraItems.length})
            </button>
          )}
        </div>
      )}

      {/* 3-column layout */}
      <div className="px-4 pb-10">
        {totalItems === 0 && !outfit.coloriGuida.length && !outfit.fantasia ? (
          <div className="flex flex-col items-center justify-center py-20 text-white/20">
            <p className="text-sm text-white/30">Outfit vuoto</p>
            <button
              onClick={() => setShowAdd(true)}
              className="mt-4 px-4 py-2 bg-white text-black text-xs rounded-lg flex items-center gap-2 hover:bg-white/90 font-medium"
            >
              <Plus size={13} /> Aggiungi prodotti
            </button>
          </div>
        ) : (
          /* Desktop: 3-column grid. Mobile: stacked */
          <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr_1.5fr] gap-6 pt-5">
            {/* Left — palette / fantasia */}
            <div>
              <p className="text-2xs text-white/30 uppercase tracking-widest mb-3">Palette & Stile</p>
              <ColorColumn swatches={outfit.coloriGuida} fantasia={outfit.fantasia} />
            </div>

            {/* Center — capi principali */}
            <div>
              <ZoneColumn
                zona="centro"
                items={centroItems}
                outfitId={outfitId}
                onRemove={(productId) => removeItem.mutate(productId)}
                onAddToCart={(item) => addToCart([item])}
              />
            </div>

            {/* Right — accessori */}
            <div>
              <ZoneColumn
                zona="destra"
                items={destraItems}
                outfitId={outfitId}
                onRemove={(productId) => removeItem.mutate(productId)}
                onAddToCart={(item) => addToCart([item])}
              />
            </div>
          </div>
        )}
      </div>

      {showAdd && (
        <AddProductsPanel
          outfitId={outfitId}
          existingIds={existingIds}
          onClose={() => setShowAdd(false)}
        />
      )}
    </div>
  );
}
