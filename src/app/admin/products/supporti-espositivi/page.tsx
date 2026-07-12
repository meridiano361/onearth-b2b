import { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import AccessoriVenditaAdmin from '@/components/admin/AccessoriVenditaAdmin';

export const metadata: Metadata = { title: 'Supporti espositivi — Admin' };

export default async function SupportiEspositivi() {
  const session = await getServerSession(authOptions);
  if (!session || !isAdminRole(session.user.role)) redirect('/admin');
  return <AccessoriVenditaAdmin />;
}
