import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useCartStore } from '@/store/cartStore';
import type { CartItem } from '@/types';

const DEBOUNCE_MS = 1500;

type ServerCartData = { items: CartItem[]; notes?: string } | null;

function saveToServer(items: CartItem[], notes: string) {
  fetch('/api/catalog/cart', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cartData: { items, notes } }),
  }).catch(() => {});
}

export function useCartSync() {
  const { data: session, status } = useSession();
  const { items, notes, bulkSet } = useCartStore();
  const initializedRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track both items AND notes to detect either kind of change for deferred saves
  const prevItemsRef = useRef<CartItem[]>(items);
  const prevNotesRef = useRef<string>(notes);

  // On login: fetch server cart and merge with local state
  useEffect(() => {
    if (status !== 'authenticated') return;
    const role = session?.user?.role;
    if (role !== 'CUSTOMER' && role !== 'OPERATOR') return;
    if (initializedRef.current) return;

    // Snapshot local state before the async operation
    const localItems = useCartStore.getState().items;
    const localNotes = useCartStore.getState().notes;

    fetch('/api/catalog/cart')
      .then((r) => r.json())
      .then((res: { cartData: ServerCartData }) => {
        initializedRef.current = true;

        const cartData = res.cartData;

        if (cartData == null) {
          // User has never synced: migrate local cart to server and keep it
          if (localItems.length > 0) {
            saveToServer(localItems, localNotes);
          }
          prevItemsRef.current = localItems;
          prevNotesRef.current = localNotes;
          return;
        }

        // Server cart exists → it is the source of truth.
        // Append any local-only items (added on this device before last sync).
        const serverItems = Array.isArray(cartData.items) ? cartData.items : [];
        const serverNotes = cartData.notes ?? '';

        const serverIds = new Set(serverItems.map((i) => i.productId));
        const localOnly = localItems.filter((i) => !serverIds.has(i.productId));

        const merged = [...serverItems, ...localOnly];
        const mergedNotes = serverNotes || localNotes;

        bulkSet(merged, mergedNotes);

        // Keep refs in sync so the save effect doesn't fire a redundant write
        prevItemsRef.current = merged;
        prevNotesRef.current = mergedNotes;

        // Persist merged state if we added local-only items
        if (localOnly.length > 0) {
          saveToServer(merged, mergedNotes);
        }
      })
      .catch(() => {
        // On network error: mark as initialized so the save effect can run normally
        initializedRef.current = true;
        prevItemsRef.current = localItems;
        prevNotesRef.current = localNotes;
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // Debounce-save to server on any cart change (items OR notes)
  useEffect(() => {
    if (status !== 'authenticated') return;
    const role = session?.user?.role;
    if (role !== 'CUSTOMER' && role !== 'OPERATOR') return;
    if (!initializedRef.current) return;

    const itemsChanged = items !== prevItemsRef.current;
    const notesChanged = notes !== prevNotesRef.current;
    if (!itemsChanged && !notesChanged) return;

    prevItemsRef.current = items;
    prevNotesRef.current = notes;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveToServer(items, notes);
    }, DEBOUNCE_MS);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [items, notes, status, session]);
}
