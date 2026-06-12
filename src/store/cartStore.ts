import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product, CartItem } from '@/types';
import { roundToLot } from '@/lib/utils';

interface CartStore {
  items: CartItem[];
  customerId: string | null;
  collectionId: string | null;
  notes: string;

  // Actions
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  setCustomerId: (id: string | null) => void;
  setCollectionId: (id: string | null) => void;
  setNotes: (notes: string) => void;
  bulkSet: (items: CartItem[], notes?: string) => void;

  // Computed
  getTotalItems: () => number;
  getTotalValue: () => number;
  getTotalLines: () => number;
  getItemQuantity: (productId: string) => number;
  hasLotWarnings: () => boolean;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      customerId: null,
      collectionId: null,
      notes: '',

      addItem: (product, quantity = 1) => {
        const { items } = get();
        const existing = items.find((i) => i.productId === product.id);

        // Snap to nearest lot size multiple
        const effectiveQty = roundToLot(quantity, product.lotSize || 1);

        if (existing) {
          set({
            items: items.map((i) =>
              i.productId === product.id
                ? { ...i, quantity: i.quantity + effectiveQty }
                : i
            ),
          });
        } else {
          set({
            items: [...items, { productId: product.id, product, quantity: effectiveQty }],
          });
        }
      },

      removeItem: (productId) => {
        set({ items: get().items.filter((i) => i.productId !== productId) });
      },

      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId);
          return;
        }
        set({
          items: get().items.map((i) =>
            i.productId === productId ? { ...i, quantity } : i
          ),
        });
      },

      clearCart: () => set({ items: [], notes: '' }),

      setCustomerId: (id) => set({ customerId: id }),

      setCollectionId: (id) => set({ collectionId: id }),

      setNotes: (notes) => set({ notes }),

      bulkSet: (items, notes) => set({ items, ...(notes !== undefined ? { notes } : {}) }),

      getTotalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),

      getTotalValue: () =>
        get().items.reduce((sum, i) => sum + i.product.costPrice * i.quantity, 0),

      getTotalLines: () => get().items.length,

      getItemQuantity: (productId) =>
        get().items.find((i) => i.productId === productId)?.quantity || 0,

      hasLotWarnings: () =>
        get().items.some((i) => {
          const lot = i.product.lotSize || 1;
          return lot > 1 && i.quantity % lot !== 0;
        }),
    }),
    {
      name: 'onearth-cart',
      partialize: (state) => ({
        items: state.items,
        customerId: state.customerId,
        collectionId: state.collectionId,
        notes: state.notes,
      }),
    }
  )
);
