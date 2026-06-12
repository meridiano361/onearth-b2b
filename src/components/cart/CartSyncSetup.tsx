'use client';

import { useCartSync } from '@/hooks/useCartSync';

export default function CartSyncSetup() {
  useCartSync();
  return null;
}
