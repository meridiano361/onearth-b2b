import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import Header from '@/components/layout/Header';
import CartSidebar from '@/components/cart/CartSidebar';
import MobileCartButton from '@/components/cart/MobileCartButton';

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
        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>

        {/* Cart sidebar — desktop */}
        <aside className="hidden lg:block w-80 xl:w-[340px] border-l border-border flex-shrink-0 bg-white overflow-y-auto">
          <CartSidebar />
        </aside>
      </div>

      {/* Mobile cart button */}
      <MobileCartButton />
    </div>
  );
}
