import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { authOptions } from '@/lib/auth';
import Header from '@/components/layout/Header';
import CartSidebar from '@/components/cart/CartSidebar';
import MobileNav from '@/components/layout/MobileNav';

// Paths where the cart sidebar should not be shown
const SIDEBAR_HIDDEN_PATHS = ['/catalog/orders', '/orders'];

export default async function B2BLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  const pathname = headers().get('x-pathname') ?? '';
  const hideSidebar = SIDEBAR_HIDDEN_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header session={session} />

      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">
          {children}
        </main>

        {/* Cart sidebar — desktop only, hidden on orders pages */}
        {!hideSidebar && (
          <aside className="hidden lg:block w-80 xl:w-[340px] border-l border-border flex-shrink-0 bg-white overflow-y-auto">
            <CartSidebar />
          </aside>
        )}
      </div>

      <MobileNav />
    </div>
  );
}
