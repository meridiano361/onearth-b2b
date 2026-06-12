import { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { canAccessModa } from '@/lib/modaAccess';
import ModaHome from '@/components/moda/ModaHome';

export const metadata: Metadata = { title: 'Moda PE27 — ON EARTH' };

export default async function ModaPage() {
  const session = await getServerSession(authOptions);
  if (!session || !canAccessModa(session.user?.email)) redirect('/catalog');
  return <ModaHome />;
}
