import { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { canAccessModa } from '@/lib/modaAccess';
import CasaHome from '@/components/catalog/CasaHome';

export const metadata: Metadata = { title: 'Casa 2027 — ON EARTH B2B' };

export default async function CasaPage() {
  const session = await getServerSession(authOptions);
  if (!session || !canAccessModa(session.user?.role)) redirect('/catalog');
  return <CasaHome />;
}
