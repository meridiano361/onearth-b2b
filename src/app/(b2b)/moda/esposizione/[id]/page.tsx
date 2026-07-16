import { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { canAccessModa } from '@/lib/modaAccess';
import { canAccessVisual } from '@/lib/modaServer';
import ModaOutfitDetail from '@/components/moda/ModaOutfitDetail';

export const metadata: Metadata = { title: 'Outfit Espositivo — Moda PE27' };

export default async function ModaOutfitDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !canAccessModa(session.user?.role, session.user?.email)) redirect('/home');
  const allowed = await canAccessVisual(session.user?.role, session.user?.organizationId, session.user?.email);
  if (!allowed) redirect('/moda');
  return <ModaOutfitDetail outfitId={params.id} />;
}
