import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { canAccessModa } from '@/lib/modaAccess';

export default async function ModaCarrelli() {
  const session = await getServerSession(authOptions);
  if (!session || !canAccessModa(session.user?.email)) redirect('/catalog');
  redirect('/catalog/carts');
}
