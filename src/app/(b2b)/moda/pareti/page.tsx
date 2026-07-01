import { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { canAccessModa } from '@/lib/modaAccess';
import ModaPareti from '@/components/moda/ModaPareti';

export const metadata: Metadata = { title: 'Visual — Moda PE27' };

export default async function ModaParetiPage() {
  const session = await getServerSession(authOptions);
  if (!session || !canAccessModa(session.user?.role)) redirect('/home');
  return <ModaPareti />;
}
