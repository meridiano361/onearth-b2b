import { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import AdminImpostazioniPage from '@/components/admin/AdminImpostazioniPage';

export const metadata: Metadata = { title: 'Impostazioni — Admin ON EARTH' };

export default async function ImpostazioniPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'SUPER_ADMIN') redirect('/admin');
  return <AdminImpostazioniPage currentUserId={session.user.id} />;
}
