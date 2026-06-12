import { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import ModaHome from '@/components/moda/ModaHome';

export const metadata: Metadata = { title: 'Moda PE27 — ON EARTH' };

export default async function ModaPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.email !== 'e.mazzolari@meridiano361.it') redirect('/catalog');
  return <ModaHome />;
}
