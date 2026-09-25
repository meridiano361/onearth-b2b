import { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { isMeridiano361Org } from '@/lib/modaServer';
import OeSectionHome from '@/components/catalog/OeSectionHome';

export const metadata: Metadata = { title: 'OE Benessere — ON EARTH B2B' };

export default async function OeBenessere() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');
  const ok = await isMeridiano361Org(session.user.role, session.user.organizationId);
  if (!ok) redirect('/home');
  return <OeSectionHome titolo="OE Benessere" />;
}
