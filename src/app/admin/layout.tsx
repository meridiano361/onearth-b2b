import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import AdminLayoutWrapper from '@/components/layout/AdminLayoutWrapper';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) redirect('/login');
  const { isAdminRole } = await import('@/lib/roles');
  if (!isAdminRole(session.user.role)) redirect('/catalog');

  return <AdminLayoutWrapper>{children}</AdminLayoutWrapper>;
}
