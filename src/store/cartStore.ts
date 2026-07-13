import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Cart, CartItem, Product } from '@/types';
import { roundToLot } from '@/lib/utils';

export interface SizeVariantQty { taglia: string; codice: string; quantity: number }

interface CartStore {
  // One active cartId per collection — persisted across sessions.
  // Key: collectionId ('moda' | 'casa'), value: cart id or null.
  cartIds: Record<string, string | null>;

  // The collection the user is currently browsing — NOT persisted,
  // set by CartSetup whenever the URL section changes.
  currentCollection: string;

  // Volatile: active cart data for the current collection.
  cartId: string | null;
  cartName: string | null;
  items: CartItem[];
  notes: string;

  pendingProduct: { product: Product; quantity: number; taglia?: string } | null;
  pendingVariants: { product: Product; variants: SizeVariantQty[] } | null;
  showCartPicker: boolean;

  setCurrentCollection: (collection: string) => void;
  setCart: (cart: Cart) => void;
  clearCart: () => void;
  /** Remove a specific collection's entry from cartIds without touching other state. */
  clearCollectionCart: (collection: string) => void;
  setPendingProduct: (p: { product: Product; quantity: number; taglia?: string } | null) => void;
  setPendingVariants: (v: { product: Product; variants: SizeVariantQty[] } | null) => void;
  setShowCartPicker: (show: boolean) => void;
  setNotes: (notes: string) => void;

  addItem: (product: Product, quantity?: number, taglia?: string) => void;
  addVariants: (product: Product, variants: SizeVariantQty[]) => void;
  removeItem: (productId: string, taglia?: string) => void;
  updateQuantity: (productId: string, quantity: number, taglia?: string) => void;

  getItemQuantity: (productId: string, taglia?: string) => number;
  getTotalItems: () => number;
  getTotalValue: () => number;
  getTotalLines: () => number;
  hasLotWarnings: () => boolean;
}

function matchItem(item: CartItem, productId: string, taglia?: string) {
  return item.productId === productId && (item.taglia ?? '') === (taglia ?? '');
}

function patchCartItem(cartId: string, productId: string, quantity: number, taglia = '') {
  fetch(`/api/catalog/carts/${cartId}/items`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId, quantity, taglia }),
  }).catch(() => {});
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      cartIds: {},
      currentCollection: 'casa',
      cartId: null,
      cartName: null,
      items: [],
      notes: '',
      pendingProduct: null,
      pendingVariants: null,
      showCartPicker: false,

      // Called by CartSetup when the URL section changes (moda ↔ casa).
      // Immediately swaps active cartId from the map; clears volatile data
      // so the sidebar shows empty while CartSetup loads the correct cart.
      setCurrentCollection: (collection) =>
        set((state) => {
          const newCartId = state.cartIds[collection] ?? null;
          const same = newCartId === state.cartId;
          return {
            currentCollection: collection,
            cartId: newCartId,
            cartName: same ? state.cartName : null,
            items: same ? state.items : [],
            notes: same ? state.notes : '',
          };
        }),

      setCart: (cart) =>
        set((state) => {
          // Use the cart's own collectionId when available so the cartIds map is
          // always correct, even if currentCollection hasn't caught up yet.
          const col = cart.collectionId || state.currentCollection;
          return {
            cartId: cart.id,
            currentCollection: col,
            cartIds: { ...state.cartIds, [col]: cart.id },
            cartName: cart.name,
            notes: cart.notes ?? '',
            items: cart.items ?? [],
          };
        }),

      clearCart: () =>
        set((state) => ({
          cartId: null,
          cartIds: { ...state.cartIds, [state.currentCollection]: null },
          cartName: null,
          items: [],
          notes: '',
          pendingProduct: null,
          pendingVariants: null,
        })),

      clearCollectionCart: (collection) =>
        set((state) => ({
          cartIds: { ...state.cartIds, [collection]: null },
          ...(state.currentCollection === collection
            ? { cartId: null, cartName: null, items: [], notes: '' }
            : {}),
        })),

      setPendingProduct: (p) => {
        if (!p) { set({ pendingProduct: null }); return; }
        const { cartId } = get();
        if (cartId) { get().addItem(p.product, p.quantity, p.taglia); return; }
        set({ pendingProduct: p });
      },
      setPendingVariants: (v) => {
        if (!v) { set({ pendingVariants: null }); return; }
        const { cartId } = get();
        if (cartId) { get().addVariants(v.product, v.variants); return; }
        set({ pendingVariants: v });
      },
      setShowCartPicker: (show) => set({ showCartPicker: show }),

      setNotes: (notes) => {
        const { cartId } = get();
        set({ notes });
        if (cartId) {
          fetch(`/api/catalog/carts/${cartId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ notes }),
          }).catch(() => {});
        }
      },

      addItem: (product, quantity = 1, taglia = '') => {
        const { cartId, items } = get();
        if (!cartId) {
          set({ pendingProduct: { product, quantity, taglia } });
          return;
        }
        const effectiveQty = roundToLot(quantity, product.lotSize || 1);
        const existing = items.find((i) => matchItem(i, product.id, taglia));
        const newQty = existing ? existing.quantity + effectiveQty : effectiveQty;
        if (existing) {
          set({ items: items.map((i) => matchItem(i, product.id, taglia) ? { ...i, quantity: newQty } : i) });
        } else {
          set({ items: [...items, { productId: product.id, product, quantity: newQty, taglia }] });
        }
        patchCartItem(cartId, product.id, newQty, taglia);
      },

      addVariants: (product, variants) => {
        const { cartId } = get();
        if (!cartId) {
          set({ pendingVariants: { product, variants } });
          return;
        }
        const { items } = get();
        let newItems = [...items];
        for (const v of variants) {
          if (v.quantity <= 0) continue;
          const effectiveQty = roundToLot(v.quantity, product.lotSize || 1);
          const existing = newItems.find((i) => matchItem(i, product.id, v.taglia));
          if (existing) {
            newItems = newItems.map((i) =>
              matchItem(i, product.id, v.taglia) ? { ...i, quantity: i.quantity + effectiveQty } : i
            );
          } else {
            newItems.push({ productId: product.id, product, quantity: effectiveQty, taglia: v.taglia });
          }
          patchCartItem(cartId, product.id,
            (newItems.find((i) => matchItem(i, product.id, v.taglia))?.quantity ?? effectiveQty),
            v.taglia
          );
        }
        set({ items: newItems });
      },

      removeItem: (productId, taglia) => {
        const { cartId, items } = get();
        set({ items: items.filter((i) => !matchItem(i, productId, taglia)) });
        if (cartId) patchCartItem(cartId, productId, 0, taglia ?? '');
      },

      updateQuantity: (productId, quantity, taglia) => {
        if (quantity <= 0) { get().removeItem(productId, taglia); return; }
        const { cartId, items } = get();
        set({ items: items.map((i) => matchItem(i, productId, taglia) ? { ...i, quantity } : i) });
        if (cartId) patchCartItem(cartId, productId, quantity, taglia ?? '');
      },

      getItemQuantity: (productId, taglia) => {
        const items = get().items;
        if (taglia !== undefined) {
          return items.find((i) => matchItem(i, productId, taglia))?.quantity || 0;
        }
        return items.filter((i) => i.productId === productId).reduce((s, i) => s + i.quantity, 0);
      },

      getTotalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),

      getTotalValue: () =>
        get().items.reduce((sum, i) => sum + Number(i.product.costPrice) * i.quantity, 0),

      getTotalLines: () => get().items.length,

      hasLotWarnings: () =>
        get().items.some((i) => {
          const lot = i.product.lotSize || 1;
          return lot > 1 && i.quantity % lot !== 0;
        }),
    }),
    {
      name: 'onearth-cart-v4',
      // Nothing persisted — catalog always starts neutral (no pre-selected cart).
      partialize: () => ({}),
    }
  )
);
