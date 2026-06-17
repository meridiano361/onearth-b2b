import { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { canAccessModa } from '@/lib/modaAccess';
import ModaRisorse from '@/components/moda/ModaRisorse';

export const metadata: Metadata = { title: 'Risorse e Media — Moda PE27' };

export default async function ModaRisorsePage() {
  const session = await getServerSession(authOptions);
  if (!session || !canAccessModa(session.user?.role)) redirect('/catalog');
  return <ModaRisorse />;
}
