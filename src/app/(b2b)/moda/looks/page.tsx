import { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { canAccessModa } from '@/lib/modaAccess';
import { canAccessVisual } from '@/lib/modaServer';
import ModaLooks from '@/components/moda/ModaLooks';

export const metadata: Metadata = { title: 'Total Look — Moda PE27' };

export default async function ModaLooksPage() {
  const session = await getServerSession(authOptions);
  if (!session || !canAccessModa(session.user?.role, session.user?.email)) redirect('/home');
  const allowed = await canAccessVisual(session.user?.role, session.user?.organizationId, session.user?.email);
  if (!allowed) redirect('/moda');
  return <ModaLooks />;
}
