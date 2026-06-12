'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { ArrowLeft, Plus, X, Search, ShoppingBag, Loader2, Edit2, Check } from 'lucide-react';
import { ProductImage } from '@/components/ui/ProductImage';
import { useCartStore } from '@/store/cartStore';
import { formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';
import type { Product } from '@/types';

type LookProdotto = {
  id: string;
  ordine: number;
  note: string | null;
  product: {
    id: string; code: string; name: string; description: string | null;
    imageUrl: string | null; costPrice: number; retailPrice: number;
    lotSize: number; iva: number; colore: string | null; famiglia: string | null;
    nomLinea: string | null; stagione: string | null;
  };
};

type Look = {
  id: string;
  titolo: string;
  descrizione: string | null;
  imageUrl: string | null;
  isActive: boolean;
  prodotti: LookProdotto[];
};

function AddProductsPanel({ lookId, existingIds, onClose }: {
  lookId: string;
  existingIds: Set<string>;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const qc = useQueryClient();

  const { data } = useQuery<{ data: Product[] }>({
    queryKey: ['moda-products-panel'],
    queryFn: () => fetch('/api/products?active=true&collezione=PE27&limit=500').then((r) => r.json()),
    staleTime: 60_000,
  });

  const products = data?.data ?? [];

  const filtered = useMemo(() => {
    if (!search.trim()) return products;
    const q = search.toLowerCase();
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q)
    );
  }, [products, search]);

  const addMutation = useMutation({
    mutationFn: (productId: string) =>
      fetch(`/api/moda/looks/${lookId}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['moda-look', lookId] }),
    onError: () => toast.error('Errore aggiunta prodotto'),
  });

  const removeMutation = useMutation({
    mutationFn: (productId: string) =>
      fetch(`/api/moda/looks/${lookId}/products?productId=${productId}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['moda-look', lookId] }),
    onError: () => toast.error('Errore rimozione prodotto'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-[#111] border border-white/10 rounded-t-2xl sm:rounded-2xl flex flex-col max-h-[85vh]">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10 flex-shrink-0">
          <div className="flex-1">
            <p className="text-sm font-medium text-white">Aggiungi prodotti PE27</p>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white/70">
            <X size={18} />
          </button>
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
            return (
              <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-white/5 flex-shrink-0">
                  <ProductImage src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-mono text-white/40">{p.code}</p>
                  <p className="text-sm text-white truncate">{p.name}</p>
                  {p.colore && <p className="text-xs text-white/30">{p.colore}</p>}
                </div>
                <button
                  onClick={() => isIn ? removeMutation.mutate(p.id) : addMutation.mutate(p.id)}
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

export default function ModaLookDetail({ lookId }: { lookId: string }) {
  const qc = useQueryClient();
  const { addItem } = useCartStore();
  const [showAdd, setShowAdd] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState('');

  const { data, isLoading } = useQuery<{ data: Look }>({
    queryKey: ['moda-look', lookId],
    queryFn: () => fetch(`/api/moda/looks/${lookId}`).then((r) => r.json()),
    staleTime: 30_000,
  });

  const look = data?.data;

  const removeProdotto = useMutation({
    mutationFn: (productId: string) =>
      fetch(`/api/moda/looks/${lookId}/products?productId=${productId}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['moda-look', lookId] }),
    onError: () => toast.error('Errore rimozione'),
  });

  const updateTitle = useMutation({
    mutationFn: (titolo: string) =>
      fetch(`/api/moda/looks/${lookId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titolo }),
      }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['moda-look', lookId] }); setEditingTitle(false); },
    onError: () => toast.error('Errore salvataggio'),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 size={24} className="text-white/30 animate-spin" />
      </div>
    );
  }

  if (!look) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-white/40">
        <p>Look non trovato</p>
      </div>
    );
  }

  const existingIds = new Set(look.prodotti.map((lp) => lp.product.id));

  function handleAddAll() {
    look!.prodotti.forEach((lp) => addItem(lp.product as any, lp.product.lotSize || 1));
    toast.success(`${look!.prodotti.length} prodotti aggiunti al carrello`);
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#0a0a0a]/95 backdrop-blur-sm px-4 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <Link href="/moda/looks" className="text-white/40 hover:text-white/70 transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-white/40 uppercase tracking-widest">Total Look</p>
            {editingTitle ? (
              <div className="flex items-center gap-2 mt-0.5">
                <input
                  value={titleValue}
                  onChange={(e) => setTitleValue(e.target.value)}
                  className="flex-1 bg-transparent text-sm font-medium text-white border-b border-white/30 focus:outline-none"
                  autoFocus
                  onKeyDown={(e) => { if (e.key === 'Enter') updateTitle.mutate(titleValue); if (e.key === 'Escape') setEditingTitle(false); }}
                />
                <button onClick={() => updateTitle.mutate(titleValue)} className="text-white/60 hover:text-white">
                  <Check size={14} />
                </button>
                <button onClick={() => setEditingTitle(false)} className="text-white/40 hover:text-white/60">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-sm font-medium truncate">{look.titolo}</p>
                <button onClick={() => { setTitleValue(look.titolo); setEditingTitle(true); }} className="text-white/20 hover:text-white/50 transition-colors flex-shrink-0">
                  <Edit2 size={12} />
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

      {/* Cover image */}
      {look.imageUrl && (
        <div className="h-56 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={look.imageUrl} alt={look.titolo} className="w-full h-full object-cover" />
        </div>
      )}

      {/* Description */}
      {look.descrizione && (
        <div className="px-5 py-4 border-b border-white/10">
          <p className="text-sm text-white/50 italic">{look.descrizione}</p>
        </div>
      )}

      {/* Products */}
      <div className="px-4 py-5">
        {look.prodotti.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-white/20">
            <p className="text-sm text-white/30">Nessun prodotto nel look</p>
            <button
              onClick={() => setShowAdd(true)}
              className="mt-4 px-4 py-2 bg-white text-black text-xs rounded-lg flex items-center gap-2 hover:bg-white/90 font-medium"
            >
              <Plus size={13} /> Aggiungi prodotti
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-white/40">{look.prodotti.length} prodott{look.prodotti.length === 1 ? 'o' : 'i'}</p>
              <button
                onClick={handleAddAll}
                className="flex items-center gap-1.5 text-xs text-white/60 hover:text-white transition-colors"
              >
                <ShoppingBag size={12} /> Aggiungi tutti al carrello
              </button>
            </div>

            <div className="space-y-3">
              {look.prodotti.map((lp) => (
                <div key={lp.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/8 group">
                  <Link href={`/catalog/${lp.product.id}`} className="w-16 h-16 rounded-lg overflow-hidden bg-white/5 flex-shrink-0">
                    <ProductImage src={lp.product.imageUrl} alt={lp.product.name} className="w-full h-full object-cover" />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono text-white/30">{lp.product.code}</p>
                    <Link href={`/catalog/${lp.product.id}`} className="text-sm text-white hover:underline underline-offset-2 line-clamp-2 leading-snug">
                      {lp.product.name}
                    </Link>
                    {lp.product.colore && <p className="text-xs text-white/30 mt-0.5">{lp.product.colore}</p>}
                    <p className="text-xs text-white/50 mt-0.5">{formatCurrency(Number(lp.product.costPrice))}</p>
                    {lp.note && <p className="text-xs text-white/30 italic mt-0.5">{lp.note}</p>}
                  </div>
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <button
                      onClick={() => addItem(lp.product as any, lp.product.lotSize || 1)}
                      className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center text-white/60 hover:bg-white hover:text-black transition-all"
                    >
                      <ShoppingBag size={13} />
                    </button>
                    <button
                      onClick={() => removeProdotto.mutate(lp.product.id)}
                      className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center text-white/20 hover:bg-red-500/20 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100"
                    >
                      <X size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {showAdd && (
        <AddProductsPanel
          lookId={lookId}
          existingIds={existingIds}
          onClose={() => setShowAdd(false)}
        />
      )}
    </div>
  );
}
