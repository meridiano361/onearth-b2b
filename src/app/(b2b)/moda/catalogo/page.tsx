import { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import ModaCatalogo from '@/components/moda/ModaCatalogo';

export const metadata: Metadata = { title: 'Catalogo Moda PE27 — ON EARTH' };

export default async function ModaCatalogoPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.email !== 'e.mazzolari@meridiano361.it') redirect('/catalog');
  return <ModaCatalogo />;
}
