'use client';

import { usePathname } from 'next/navigation';
import CartSidebar from './CartSidebar';

const HIDDEN_PATHS = ['/catalog/orders'];

export default function CartSidebarConditional() {
  const pathname = usePathname();
  if (HIDDEN_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) return null;
  return <CartSidebar />;
}
