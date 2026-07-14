import { Suspense } from 'react';
import { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { canAccessModa } from '@/lib/modaAccess';
import { canAccessFullModa } from '@/lib/modaServer';
import CatalogView from '@/components/catalog/CatalogView';

export const metadata: Metadata = { title: 'Catalogo Moda PE27 — ON EARTH' };

export default async function ModaCatalogoPage() {
  const session = await getServerSession(authOptions);
  if (!session || !canAccessModa(session.user?.role, session.user?.email)) redirect('/home');

  const hasFull = await canAccessFullModa(session.user?.role, session.user?.organizationId);

  return (
    <Suspense fallback={null}>
      <CatalogView
        lockedCollezione="PE27"
        {...(!hasFull && { lockedFamiglia: 'Bigiotteria e gioielleria' })}
      />
    </Suspense>
  );
}
