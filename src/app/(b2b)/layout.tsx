import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import Header from '@/components/layout/Header';
import CartSidebarConditional from '@/components/cart/CartSidebarConditional';
import MobileNav from '@/components/layout/MobileNav';

export default async function B2BLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header session={session} />

      <div className="flex flex-1 overflow-hidden">
        {/* Main content — pb-20 on mobile to clear the tab bar */}
        <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">
          {children}
        </main>

        {/* Cart sidebar — desktop only, hidden on /catalog/orders */}
        <CartSidebarConditional />
      </div>

      {/* Mobile bottom tab bar (Catalogo | Cart | Ordini) */}
      <MobileNav />
    </div>
  );
}
