'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Loader2, Plus, ShoppingCart, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCartStore } from '@/store/cartStore';
import type { Cart } from '@/types';

/** Loads the active cart from server on login, and shows the select-cart modal when needed. */
export default function CartSetup() {
  const { status } = useSession();
  const { cartId, items, setCart, clearCart, pendingProduct, setPendingProduct, addItem } = useCartStore();
  const queryClient = useQueryClient();

  // Invalidate my-carts whenever local items change so CartsView always shows fresh data
  useEffect(() => {
    if (status !== 'authenticated') return;
    queryClient.invalidateQueries({ queryKey: ['my-carts'] });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  // Load cart from server when authenticated
  useEffect(() => {
    if (status !== 'authenticated') return;

    if (cartId) {
      fetch(`/api/catalog/carts/${cartId}`)
        .then((r) => r.json())
        .then((res) => {
          if (res.data) {
            setCart(res.data as Cart);
          } else {
            clearCart();
            loadFirstCart();
          }
        })
        .catch(() => {});
    } else {
      loadFirstCart();
    }

    // One-time migration: import items from the old localStorage cart (key 'onearth-cart')
    migrateOldCart();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  function loadFirstCart() {
    fetch('/api/catalog/carts')
      .then((r) => r.json())
      .then((res) => {
        const carts: Cart[] = res.data ?? [];
        if (carts.length > 0) setCart(carts[0]);
      })
      .catch(() => {});
  }

  async function migrateOldCart() {
    const MIGRATION_DONE_KEY = 'onearth-cart-migrated';
    if (localStorage.getItem(MIGRATION_DONE_KEY)) return;
    localStorage.setItem(MIGRATION_DONE_KEY, '1');

    try {
      const raw = localStorage.getItem('onearth-cart');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const items: { productId: string; quantity: number }[] = parsed?.state?.items ?? [];
      if (items.length === 0) return;

      // Create a new cart named "Bozza recuperata"
      const res = await fetch('/api/catalog/carts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Bozza recuperata' }),
      });
      if (!res.ok) return;
      const { data: newCart } = await res.json();

      // Add all items
      await Promise.all(
        items.map(({ productId, quantity }) =>
          fetch(`/api/catalog/carts/${newCart.id}/items`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId, quantity }),
          }).catch(() => {})
        )
      );

      queryClient.invalidateQueries({ queryKey: ['my-carts'] });
      toast.success('Carrello precedente recuperato come "Bozza recuperata"');
      localStorage.removeItem('onearth-cart');
    } catch { /* silently ignore */ }
  }

  // ── Select-cart modal (shown when pendingProduct is set and no active cart) ──
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const { data: carts = [] } = useQuery<Cart[]>({
    queryKey: ['my-carts'],
    queryFn: () => fetch('/api/catalog/carts').then((r) => r.json()).then((d) => d.data as Cart[]),
    enabled: !!pendingProduct,
  });

  if (!pendingProduct) return null;

  async function handleSelectCart(cart: Cart) {
    setCart(cart);
    setPendingProduct(null);
    // Execute the pending add
    const effectiveQty = pendingProduct!.quantity;
    const product = pendingProduct!.product;
    fetch(`/api/catalog/carts/${cart.id}/items`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: product.id, quantity: effectiveQty }),
    }).catch(() => {});
    // Also update local store items
    setCart({ ...cart, items: [...(cart.items ?? []), { productId: product.id, product, quantity: effectiveQty }] });
    toast.success(`Aggiunto a "${cart.name}"`);
  }

  async function handleCreateAndAdd() {
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
      queryClient.invalidateQueries({ queryKey: ['my-carts'] });
      await handleSelectCart(body.data as Cart);
    } catch (e: any) {
      toast.error(e.message ?? 'Errore');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setPendingProduct(null)} />
      <div className="relative z-10 bg-white w-full sm:max-w-sm sm:rounded-lg shadow-xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <ShoppingCart size={14} className="text-gray-500" />
            <p className="text-sm font-semibold text-primary">In quale carrello?</p>
          </div>
          <button onClick={() => setPendingProduct(null)} className="text-gray-400 hover:text-primary p-1">
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-3">
          <p className="text-xs text-gray-500">
            Scegli un carrello esistente o creane uno nuovo per aggiungere{' '}
            <span className="font-medium text-primary">{pendingProduct.product.name}</span>.
          </p>

          {/* Existing carts */}
          {carts.length > 0 && (
            <div className="space-y-2">
              {carts.map((cart) => (
                <button
                  key={cart.id}
                  onClick={() => handleSelectCart(cart)}
                  className="w-full flex items-center justify-between px-3 py-2.5 border border-border rounded text-left hover:border-accent hover:bg-accent/5 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-primary">{cart.name}</p>
                    <p className="text-2xs text-gray-400">{(cart.items?.length ?? 0)} articoli</p>
                  </div>
                  <Check size={13} className="text-accent opacity-0 group-hover:opacity-100" />
                </button>
              ))}
            </div>
          )}

          {/* Create new */}
          {showCreate ? (
            <div className="space-y-2 pt-1">
              <input
                autoFocus
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreateAndAdd(); if (e.key === 'Escape') setShowCreate(false); }}
                placeholder="Nome carrello…"
                className="w-full h-9 border border-border rounded px-3 text-sm text-primary focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <div className="flex gap-2">
                <button onClick={() => setShowCreate(false)} className="flex-1 py-2 text-xs border border-border rounded text-gray-500 hover:bg-cream">
                  Annulla
                </button>
                <button
                  onClick={handleCreateAndAdd}
                  disabled={creating || !newName.trim()}
                  className="flex-1 py-2 text-xs bg-primary text-background rounded hover:bg-warm-darker disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {creating ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                  Crea e aggiungi
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowCreate(true)}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs border border-dashed border-border rounded text-gray-500 hover:border-accent hover:text-accent transition-colors"
            >
              <Plus size={12} /> Nuovo carrello
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
