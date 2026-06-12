import { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { canAccessModa } from '@/lib/modaAccess';
import ModaLooks from '@/components/moda/ModaLooks';

export const metadata: Metadata = { title: 'Total Look — Moda PE27' };

export default async function ModaLooksPage() {
  const session = await getServerSession(authOptions);
  if (!session || !canAccessModa(session.user?.email)) redirect('/catalog');
  return <ModaLooks />;
}
