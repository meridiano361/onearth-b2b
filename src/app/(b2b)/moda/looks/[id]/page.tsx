import { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { canAccessModa } from '@/lib/modaAccess';
import ModaLookDetail from '@/components/moda/ModaLookDetail';

export const metadata: Metadata = { title: 'Total Look — Moda PE27' };

export default async function ModaLookDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !canAccessModa(session.user?.role)) redirect('/home');
  return <ModaLookDetail lookId={params.id} />;
}
