import { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { canAccessModa } from '@/lib/modaAccess';
import ModaCatalogo from '@/components/moda/ModaCatalogo';

export const metadata: Metadata = { title: 'Catalogo Moda PE27 — ON EARTH' };

export default async function ModaCatalogoPage() {
  const session = await getServerSession(authOptions);
  if (!session || !canAccessModa(session.user?.email)) redirect('/catalog');
  return <ModaCatalogo />;
}
