import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useCartStore } from '@/store/cartStore';
import type { CartItem } from '@/types';

const DEBOUNCE_MS = 1500;

export function useCartSync() {
  const { data: session, status } = useSession();
  const { items, notes, bulkSet } = useCartStore();
  const initializedRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevItemsRef = useRef<CartItem[]>(items);

  // On login: load server cart if local cart is empty
  useEffect(() => {
    if (status !== 'authenticated') return;
    const role = session?.user?.role;
    if (role !== 'CUSTOMER' && role !== 'OPERATOR') return;
    if (initializedRef.current) return;
    initializedRef.current = true;

    if (items.length > 0) return; // local cart wins

    fetch('/api/catalog/cart')
      .then((r) => r.json())
      .then((res) => {
        if (!res.cartData) return;
        const { items: serverItems, notes: serverNotes } = res.cartData as { items: CartItem[]; notes?: string };
        if (Array.isArray(serverItems) && serverItems.length > 0) {
          bulkSet(serverItems, serverNotes ?? '');
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // Debounce-save to server whenever items change (after initial load)
  useEffect(() => {
    if (status !== 'authenticated') return;
    const role = session?.user?.role;
    if (role !== 'CUSTOMER' && role !== 'OPERATOR') return;
    if (!initializedRef.current) return;
    if (items === prevItemsRef.current) return;
    prevItemsRef.current = items;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      fetch('/api/catalog/cart', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cartData: { items, notes } }),
      }).catch(() => {});
    }, DEBOUNCE_MS);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [items, notes, status, session]);
}
