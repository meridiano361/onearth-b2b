import { Suspense } from 'react';
import { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { canAccessModa } from '@/lib/modaAccess';
import CatalogView from '@/components/catalog/CatalogView';

export const metadata: Metadata = { title: 'Catalogo Moda PE27 — ON EARTH' };

export default async function ModaCatalogoPage() {
  const session = await getServerSession(authOptions);
  if (!session || !canAccessModa(session.user?.role)) redirect('/catalog');
  return (
    <Suspense fallback={null}>
      <CatalogView lockedCollezione="PE27" />
    </Suspense>
  );
}
