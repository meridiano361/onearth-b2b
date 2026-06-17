import { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { canAccessModa } from '@/lib/modaAccess';
import CustomerHome from '@/components/catalog/CustomerHome';
import AdminExperimentalLanding from '@/components/catalog/AdminExperimentalLanding';

export const metadata: Metadata = {
  title: 'Home — ON EARTH B2B',
};

export default async function CatalogHomePage() {
  const session = await getServerSession(authOptions);

  // Experimental admin landing — server-side check, zero client trace for other users
  if (canAccessModa(session?.user?.role)) {
    return <AdminExperimentalLanding />;
  }

  return <CustomerHome />;
}
