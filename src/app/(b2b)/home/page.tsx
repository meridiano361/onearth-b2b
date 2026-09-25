import { Metadata } from 'next';
import { Suspense } from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { canAccessModa } from '@/lib/modaAccess';
import { isMeridiano361Org } from '@/lib/modaServer';
import CustomerHome from '@/components/catalog/CustomerHome';

export const metadata: Metadata = { title: 'Home — ON EARTH B2B' };

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  const [canSeeModa, showOe] = await Promise.all([
    Promise.resolve(canAccessModa(session?.user?.role, session?.user?.email)),
    isMeridiano361Org(session?.user?.role, session?.user?.organizationId),
  ]);

  return (
    <Suspense>
      <CustomerHome canSeeModa={canSeeModa} showOeSections={showOe} />
    </Suspense>
  );
}
