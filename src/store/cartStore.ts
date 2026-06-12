import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Cart, CartItem, Product } from '@/types';
import { roundToLot } from '@/lib/utils';

interface CartStore {
  // Active cart metadata (not persisted — loaded from server on mount)
  cartId: string | null;
  cartName: string | null;
  items: CartItem[];
  notes: string;

  // Triggered when user tries to add a product without an active cart
  pendingProduct: { product: Product; quantity: number } | null;

  // Actions
  setCart: (cart: Cart) => void;
  clearCart: () => void;
  setPendingProduct: (p: { product: Product; quantity: number } | null) => void;
  setNotes: (notes: string) => void;

  // Item mutations — optimistic update + fire-and-forget API call
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;

  // Computed
  getItemQuantity: (productId: string) => number;
  getTotalItems: () => number;
  getTotalValue: () => number;
  getTotalLines: () => number;
  hasLotWarnings: () => boolean;
}

function patchCartItem(cartId: string, productId: string, quantity: number) {
  fetch(`/api/catalog/carts/${cartId}/items`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId, quantity }),
  }).catch(() => {});
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      cartId: null,
      cartName: null,
      items: [],
      notes: '',
      pendingProduct: null,

      setCart: (cart) =>
        set({
          cartId: cart.id,
          cartName: cart.name,
          notes: cart.notes ?? '',
          items: cart.items ?? [],
        }),

      clearCart: () =>
        set({ cartId: null, cartName: null, items: [], notes: '', pendingProduct: null }),

      setPendingProduct: (p) => set({ pendingProduct: p }),

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

      addItem: (product, quantity = 1) => {
        const { cartId, items } = get();
        if (!cartId) {
          set({ pendingProduct: { product, quantity } });
          return;
        }
        const effectiveQty = roundToLot(quantity, product.lotSize || 1);
        const existing = items.find((i) => i.productId === product.id);
        const newQty = existing ? existing.quantity + effectiveQty : effectiveQty;
        if (existing) {
          set({ items: items.map((i) => i.productId === product.id ? { ...i, quantity: newQty } : i) });
        } else {
          set({ items: [...items, { productId: product.id, product, quantity: newQty }] });
        }
        patchCartItem(cartId, product.id, newQty);
      },

      removeItem: (productId) => {
        const { cartId, items } = get();
        set({ items: items.filter((i) => i.productId !== productId) });
        if (cartId) patchCartItem(cartId, productId, 0);
      },

      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) { get().removeItem(productId); return; }
        const { cartId, items } = get();
        set({ items: items.map((i) => i.productId === productId ? { ...i, quantity } : i) });
        if (cartId) patchCartItem(cartId, productId, quantity);
      },

      getItemQuantity: (productId) =>
        get().items.find((i) => i.productId === productId)?.quantity || 0,

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
      name: 'onearth-cart-v2',
      // Only persist cartId — items are loaded from server on mount
      partialize: (state) => ({ cartId: state.cartId }),
    }
  )
);
