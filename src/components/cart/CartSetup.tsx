'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Loader2, Plus, ShoppingCart, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCartStore } from '@/store/cartStore';
import { useCollectionRoutes } from '@/hooks/useCollectionRoutes';
import type { Cart } from '@/types';

/** Loads the active cart from server on login, handles collection switching, and shows the select-cart modal when needed. */
export default function CartSetup() {
  const { status } = useSession();
  const routes = useCollectionRoutes();
  const { collectionId } = routes;

  const {
    cartIds,
    cartId,
    setCart,
    clearCart,
    setCurrentCollection,
    clearCollectionCart,
    pendingProduct,
    setPendingProduct,
    addItem,
    pendingVariants,
    setPendingVariants,
    addVariants,
    items,
  } = useCartStore();

  const queryClient = useQueryClient();

  // Invalidate my-carts whenever local items change so CartsView always shows fresh data
  useEffect(() => {
    if (status !== 'authenticated') return;
    queryClient.invalidateQueries({ queryKey: ['my-carts'] });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  // On auth or collection change: sync the active cart to the current collection.
  useEffect(() => {
    if (status !== 'authenticated') return;

    // Update the store's active collection (swaps cartId from the map).
    setCurrentCollection(collectionId);

    // Read the up-to-date state synchronously to avoid stale closure.
    const savedCartId = useCartStore.getState().cartIds[collectionId] ?? null;

    if (savedCartId) {
      fetch(`/api/catalog/carts/${savedCartId}`)
        .then((r) => r.json())
        .then((res) => {
          if (res.data && res.data.collectionId === collectionId) {
            setCart(res.data as Cart);
          } else {
            // Saved cartId belongs to a different collection — wipe the stale
            // reference so the store isn't stuck with a wrong-collection cartId
            // if loadFirstCart finds nothing.
            clearCollectionCart(collectionId);
            loadFirstCart(collectionId);
          }
        })
        .catch(() => {});
    } else {
      loadFirstCart(collectionId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, collectionId]);

  // One-time migration: import items from the old localStorage cart on first login.
  useEffect(() => {
    if (status !== 'authenticated') return;
    migrateOldCart();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  function loadFirstCart(collection: string) {
    fetch(`/api/catalog/carts?collection=${collection}`)
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
      const legacyItems: { productId: string; quantity: number }[] = parsed?.state?.items ?? [];
      if (legacyItems.length === 0) return;

      const res = await fetch('/api/catalog/carts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Bozza recuperata', collectionId }),
      });
      if (!res.ok) return;
      const { data: newCart } = await res.json();

      await Promise.all(
        legacyItems.map(({ productId, quantity }) =>
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

  // ── Select-cart modal ─────────────────────────────────────────────────────────
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const { data: carts = [] } = useQuery<Cart[]>({
    queryKey: ['my-carts', collectionId],
    queryFn: () =>
      fetch(`/api/catalog/carts?collection=${collectionId}`)
        .then((r) => r.json())
        .then((d) => d.data as Cart[]),
    enabled: !!pendingProduct || !!pendingVariants,
  });

  if (!pendingProduct && !pendingVariants) return null;

  const pendingName = pendingProduct?.product.name ?? pendingVariants?.product.name;

  function closePending() {
    setPendingProduct(null);
    setPendingVariants(null);
  }

  async function handleSelectCart(cart: Cart) {
    setCart(cart);
    if (pendingVariants) {
      const { product, variants } = pendingVariants;
      setPendingVariants(null);
      addVariants(product, variants);
      const totalPz = variants.reduce((s, v) => s + v.quantity, 0);
      toast.success(`Aggiunte ${totalPz} pz a "${cart.name}"`);
      return;
    }
    setPendingProduct(null);
    const effectiveQty = pendingProduct!.quantity;
    const product = pendingProduct!.product;
    fetch(`/api/catalog/carts/${cart.id}/items`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: product.id, quantity: effectiveQty }),
    }).catch(() => {});
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
        body: JSON.stringify({ name: newName.trim(), collectionId }),
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
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closePending} />
      <div className="relative z-10 bg-white w-full sm:max-w-sm sm:rounded-lg shadow-xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <ShoppingCart size={14} className="text-gray-500" />
            <p className="text-sm font-semibold text-primary">In quale carrello?</p>
          </div>
          <button onClick={closePending} className="text-gray-400 hover:text-primary p-1">
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-3">
          <p className="text-xs text-gray-500">
            Scegli un carrello esistente o creane uno nuovo per aggiungere{' '}
            <span className="font-medium text-primary">{pendingName}</span>.
          </p>

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
