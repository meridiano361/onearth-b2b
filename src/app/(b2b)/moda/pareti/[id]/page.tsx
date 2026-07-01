import { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { canAccessModa } from '@/lib/modaAccess';
import ModaPareteEditor from '@/components/moda/ModaPareteEditor';

export const metadata: Metadata = { title: 'Parete Attrezzata — Moda PE27' };

export default async function ModaPareteDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !canAccessModa(session.user?.role)) redirect('/home');
  return <ModaPareteEditor pareteId={params.id} />;
}
