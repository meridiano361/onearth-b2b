import { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { canAccessModa } from '@/lib/modaAccess';
import ModaEsposizione from '@/components/moda/ModaEsposizione';

export const metadata: Metadata = { title: 'Esposizione — Moda PE27' };

export default async function ModaEsposizionePage() {
  const session = await getServerSession(authOptions);
  if (!session || !canAccessModa(session.user?.role, session.user?.email)) redirect('/home');
  return <ModaEsposizione />;
}
