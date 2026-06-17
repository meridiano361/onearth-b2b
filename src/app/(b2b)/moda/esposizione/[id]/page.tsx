import { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { canAccessModa } from '@/lib/modaAccess';
import ModaOutfitDetail from '@/components/moda/ModaOutfitDetail';

export const metadata: Metadata = { title: 'Outfit Espositivo — Moda PE27' };

export default async function ModaOutfitDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !canAccessModa(session.user?.role)) redirect('/catalog');
  return <ModaOutfitDetail outfitId={params.id} />;
}
