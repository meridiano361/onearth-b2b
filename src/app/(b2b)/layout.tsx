import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { authOptions } from '@/lib/auth';
import Header from '@/components/layout/Header';
import CartSidebar from '@/components/cart/CartSidebar';
import MobileNav from '@/components/layout/MobileNav';

const SIDEBAR_HIDDEN_PATHS = ['/catalog/orders'];

export default async function B2BLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  const headersList = headers();
  const pathname = headersList.get('x-pathname') ?? '';
  const hideSidebar = SIDEBAR_HIDDEN_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header session={session} />

      <div className="flex flex-1 overflow-hidden">
        {/* Main content — pb-20 on mobile to clear the tab bar */}
        <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">
          {children}
        </main>

        {/* Cart sidebar — desktop only, hidden on /catalog/orders */}
        {!hideSidebar && (
          <aside className="hidden lg:block w-80 xl:w-[340px] border-l border-border flex-shrink-0 bg-white overflow-y-auto">
            <CartSidebar />
          </aside>
        )}
      </div>

      {/* Mobile bottom tab bar (Catalogo | Cart | Ordini) */}
      <MobileNav />
    </div>
  );
}
