import { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { canAccessModa } from '@/lib/modaAccess';
import CustomerOrdersView from '@/components/orders/CustomerOrdersView';

export const metadata: Metadata = { title: 'Ordini Moda PE27 — ON EARTH B2B' };

export default async function ModaOrdini() {
  const session = await getServerSession(authOptions);
  if (!session || !canAccessModa(session.user?.role, session.user?.email)) redirect('/home');
  return <CustomerOrdersView />;
}
