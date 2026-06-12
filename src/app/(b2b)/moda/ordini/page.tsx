import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';

export default async function ModaOrdiniPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.email !== 'e.mazzolari@meridiano361.it') redirect('/catalog');
  redirect('/catalog/orders');
}
