'use client';

import { usePathname } from 'next/navigation';
import CartSidebar from './CartSidebar';

const HIDDEN_EXACT = ['/catalog', '/home'];
const HIDDEN_PATHS = ['/catalog/orders', '/orders', '/catalog/destinazioni', '/moda/pareti', '/moda/visual'];

export default function CartSidebarConditional() {
  const pathname = usePathname();
  if (
    HIDDEN_EXACT.includes(pathname) ||
    HIDDEN_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))
  ) return null;
  return (
    <aside className="hidden lg:block w-80 xl:w-[340px] border-l border-border flex-shrink-0 bg-white overflow-y-auto">
      <CartSidebar />
    </aside>
  );
}
