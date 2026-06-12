'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  AlertCircle, Check, ChevronDown, ChevronUp,
  Loader2, Pencil, Plus, ShoppingCart, Trash2, X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { cn, formatCurrency, isValidLotQuantity } from '@/lib/utils';
import { useCartStore } from '@/store/cartStore';
import { ProductImage } from '@/components/ui/ProductImage';
import QuantitySelector from '@/components/catalog/QuantitySelector';
import type { Cart } from '@/types';

export default function CartsView() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { cartId, setCart, clearCart, updateQuantity: storeUpdateQty, removeItem: storeRemoveItem } = useCartStore();

  const { data: carts = [], isLoading } = useQuery<Cart[]>({
    queryKey: ['my-carts'],
    queryFn: () => fetch('/api/catalog/carts').then((r) => r.json()).then((d) => d.data as Cart[]),
  });

  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameInput, setRenameInput] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  async function handleCreate() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/catalog/carts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'Errore');
      setCart(body.data as Cart);
      queryClient.invalidateQueries({ queryKey: ['my-carts'] });
      setNewName('');
      setShowCreate(false);
      toast.success(`Carrello "${body.data.name}" creato`);
    } catch (e: any) {
      toast.error(e.message ?? 'Errore');
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(cart: Cart) {
    setDeletingId(cart.id);
    try {
      const res = await fetch(`/api/catalog/carts/${cart.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Errore eliminazione');
      if (cartId === cart.id) clearCart();
      if (expandedId === cart.id) setExpandedId(null);
      queryClient.invalidateQueries({ queryKey: ['my-carts'] });
      toast.success('Carrello eliminato');
    } catch {
      toast.error('Errore eliminazione');
    } finally {
      setDeletingId(null);
    }
  }

  async function handleRename(cart: Cart) {
    if (!renameInput.trim() || renameInput.trim() === cart.name) {
      setRenamingId(null);
      return;
    }
    try {
      const res = await fetch(`/api/catalog/carts/${cart.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: renameInput.trim() }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'Errore');
      if (cartId === cart.id) setCart(body.data as Cart);
      queryClient.invalidateQueries({ queryKey: ['my-carts'] });
      toast.success('Rinominato');
    } catch {
      toast.error('Errore rinomina');
    } finally {
      setRenamingId(null);
    }
  }

  function handleActivate(cart: Cart) {
    setCart(cart);
    toast.success(`Carrello "${cart.name}" attivo`);
  }

  async function handleUpdateQty(cart: Cart, productId: string, quantity: number) {
    if (cart.id === cartId) {
      // Active cart — delegate to store (handles API + local state)
      storeUpdateQty(productId, quantity);
    } else {
      // Non-active cart — direct API call
      fetch(`/api/catalog/carts/${cart.id}/items`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, quantity }),
      }).catch(() => {});
    }
    // Optimistically update the query cache
    queryClient.setQueryData<Cart[]>(['my-carts'], (prev = []) =>
      prev.map((c) =>
        c.id !== cart.id ? c : {
          ...c,
          items: quantity <= 0
            ? (c.items ?? []).filter((i) => i.productId !== productId)
            : (c.items ?? []).map((i) =>
                i.productId === productId ? { ...i, quantity } : i
              ),
        }
      )
    );
  }

  const totalValue = (cart: Cart) =>
    (cart.items ?? []).reduce((s, i) => s + Number(i.product.costPrice) * i.quantity, 0);

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-primary tracking-tight">Carrelli</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {isLoading ? '…' : `${carts.length} ${carts.length === 1 ? 'carrello' : 'carrelli'} attivi`}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 text-xs bg-primary text-background rounded px-3 py-2 hover:bg-warm-darker transition-colors"
        >
          <Plus size={13} /> Nuovo carrello
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="mb-4 bg-white border border-border rounded p-4 space-y-3">
          <p className="text-xs font-semibold text-primary">Nuovo carrello</p>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setShowCreate(false); }}
            autoFocus
            placeholder="es. Natale 2026, Riassortimento Milano…"
            className="w-full h-9 border border-border rounded px-3 text-sm text-primary focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <div className="flex gap-2">
            <button
              onClick={() => { setShowCreate(false); setNewName(''); }}
              className="flex-1 py-2 text-xs border border-border rounded text-gray-500 hover:bg-cream transition-colors"
            >
              Annulla
            </button>
            <button
              onClick={handleCreate}
              disabled={creating || !newName.trim()}
              className="flex-1 py-2 text-xs bg-primary text-background rounded hover:bg-warm-darker transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {creating ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
              Crea
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && carts.length === 0 && (
        <div className="text-center py-20">
          <ShoppingCart size={36} className="text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-400 mb-1">Nessun carrello</p>
          <p className="text-xs text-gray-300">Crea il primo carrello per iniziare ad aggiungere prodotti.</p>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-4 text-xs text-accent hover:underline"
          >
            + Crea carrello
          </button>
        </div>
      )}

      {/* Cart list */}
      <div className="space-y-3">
        {carts.map((cart) => {
          const isActive = cartId === cart.id;
          const isDeleting = deletingId === cart.id;
          const isRenaming = renamingId === cart.id;
          const isExpanded = expandedId === cart.id;
          const items = cart.items ?? [];
          const itemCount = items.length;
          const pzCount = items.reduce((s, i) => s + i.quantity, 0);
          const value = totalValue(cart);

          return (
            <div
              key={cart.id}
              className={cn(
                'bg-white border rounded overflow-hidden transition-all',
                isActive ? 'border-accent shadow-luxury' : 'border-border'
              )}
            >
              <div className="p-4 space-y-3">
                {/* Name row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    {isRenaming ? (
                      <div className="flex items-center gap-2">
                        <input
                          autoFocus
                          value={renameInput}
                          onChange={(e) => setRenameInput(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleRename(cart); if (e.key === 'Escape') setRenamingId(null); }}
                          className="flex-1 h-7 text-xs border border-accent rounded px-2 focus:outline-none"
                        />
                        <button onClick={() => handleRename(cart)} className="text-accent"><Check size={13} /></button>
                        <button onClick={() => setRenamingId(null)} className="text-gray-400"><X size={13} /></button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-primary truncate">{cart.name}</p>
                        {isActive && (
                          <span className="text-2xs bg-accent/10 text-accent px-1.5 py-0.5 rounded font-medium flex-shrink-0">attivo</span>
                        )}
                      </div>
                    )}
                    <p className="text-2xs text-gray-400 mt-0.5">
                      {itemCount} {itemCount === 1 ? 'articolo' : 'articoli'} · {pzCount} pz
                      {value > 0 && ` · ${formatCurrency(value)}`}
                    </p>
                  </div>

                  {/* Icon actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => { setRenamingId(cart.id); setRenameInput(cart.name); }}
                      className="p-1.5 text-gray-400 hover:text-primary transition-colors rounded hover:bg-cream"
                      title="Rinomina"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      onClick={() => handleDelete(cart)}
                      disabled={isDeleting}
                      className="p-1.5 text-gray-300 hover:text-red-500 transition-colors rounded hover:bg-red-50 disabled:opacity-40"
                      title="Elimina"
                    >
                      {isDeleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                    </button>
                  </div>
                </div>

                {/* Button row */}
                <div className="flex items-center gap-2 flex-wrap">
                  {!isActive && (
                    <button
                      onClick={() => handleActivate(cart)}
                      className="text-xs border border-border rounded px-3 py-1.5 text-gray-500 hover:text-primary hover:bg-cream transition-colors"
                    >
                      Seleziona
                    </button>
                  )}
                  <button
                    onClick={() => router.push('/catalog/products')}
                    disabled={!isActive}
                    className="text-xs border border-border rounded px-3 py-1.5 text-gray-500 hover:text-primary hover:bg-cream transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    title={isActive ? 'Vai al catalogo' : 'Seleziona prima questo carrello'}
                  >
                    + Aggiungi prodotti
                  </button>
                  {itemCount > 0 && (
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : cart.id)}
                      className="ml-auto flex items-center gap-1 text-xs text-gray-400 hover:text-primary transition-colors"
                    >
                      {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      {isExpanded ? 'Nascondi' : `Vedi prodotti (${itemCount})`}
                    </button>
                  )}
                </div>
              </div>

              {/* Expanded product list */}
              {isExpanded && itemCount > 0 && (
                <div className="border-t border-border/60">
                  {items.map((item) => {
                    const hasLotWarning = !isValidLotQuantity(item.quantity, item.product.lotSize);
                    return (
                      <div
                        key={item.productId}
                        className={cn(
                          'flex items-start gap-3 px-4 py-3 border-b border-border/40 last:border-b-0',
                          hasLotWarning && 'bg-amber-50/50'
                        )}
                      >
                        {/* Thumbnail */}
                        <div className="w-10 h-10 flex-shrink-0 rounded bg-cream border border-border overflow-hidden">
                          <ProductImage
                            src={item.product.imageUrl}
                            alt={item.product.name}
                            className="w-full h-full object-cover"
                          />
                        </div>

                        {/* Info + controls */}
                        <div className="flex-1 min-w-0">
                          <p className="text-2xs font-mono text-gray-400 leading-none mb-0.5">{item.product.code}</p>
                          <p className="text-xs text-primary leading-snug line-clamp-1 mb-1.5">{item.product.name}</p>
                          <div className="flex items-center gap-2">
                            <QuantitySelector
                              value={item.quantity}
                              onChange={(qty) => handleUpdateQty(cart, item.productId, qty)}
                              lotSize={item.product.lotSize}
                              min={0}
                              compact
                            />
                            <span className="text-xs font-medium text-primary ml-auto">
                              {formatCurrency(Number(item.product.costPrice) * item.quantity)}
                            </span>
                          </div>
                          {hasLotWarning && (
                            <div className="flex items-center gap-1 mt-1">
                              <AlertCircle size={10} className="text-amber-500 flex-shrink-0" />
                              <p className="text-2xs text-amber-600">Multiplo di {item.product.lotSize}</p>
                            </div>
                          )}
                        </div>

                        {/* Remove */}
                        <button
                          onClick={() => handleUpdateQty(cart, item.productId, 0)}
                          className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0 mt-0.5 p-0.5"
                          title="Rimuovi"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
