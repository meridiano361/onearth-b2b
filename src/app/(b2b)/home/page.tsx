import { Metadata } from 'next';
import { Suspense } from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { canAccessModa } from '@/lib/modaAccess';
import CustomerHome from '@/components/catalog/CustomerHome';

export const metadata: Metadata = { title: 'Home — ON EARTH B2B' };

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  const canSeeModa = canAccessModa(session?.user?.role, session?.user?.email);

  return (
    <Suspense>
      <CustomerHome canSeeModa={canSeeModa} />
    </Suspense>
  );
}
