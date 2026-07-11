import { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import CasaHome from '@/components/catalog/CasaHome';

export const metadata: Metadata = { title: 'Casa — ON EARTH B2B' };

export default async function CasaPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');
  return <CasaHome />;
}
