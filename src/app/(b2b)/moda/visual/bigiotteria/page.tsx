import { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import ModaVisualBigiotteria from '@/components/moda/ModaVisualBigiotteria';

export const metadata: Metadata = { title: 'Visual Bigiotteria' };

export default async function VisualBigiotteriaPage() {
  const session = await getServerSession(authOptions);
  if (!session || !isAdminRole(session.user?.role)) redirect('/home');
  return <ModaVisualBigiotteria />;
}
