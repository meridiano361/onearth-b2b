import { Metadata } from 'next';
import { Suspense } from 'react';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { canAccessModa } from '@/lib/modaAccess';
import ColorWheelView from '@/components/moda/ColorWheelView';

export const metadata: Metadata = { title: 'Ruota Cromatica — Moda PE27' };

export default async function ColorWheelPage() {
  const session = await getServerSession(authOptions);
  if (!session || !canAccessModa(session.user?.role, session.user?.email)) redirect('/home');
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 size={24} className="animate-spin text-gray-400" /></div>}>
      <ColorWheelView />
    </Suspense>
  );
}
