import { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { canAccessModa } from '@/lib/modaAccess';
import ColorWheelView from '@/components/moda/ColorWheelView';

export const metadata: Metadata = { title: 'Color Wheel — Moda PE27' };

export default async function ColorWheelPage() {
  const session = await getServerSession(authOptions);
  if (!session || !canAccessModa(session.user?.role)) redirect('/catalog');
  return <ColorWheelView />;
}
