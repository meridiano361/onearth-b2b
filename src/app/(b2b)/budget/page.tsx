import { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { isMeridiano361Org } from '@/lib/modaServer';
import BudgetPlanner from '@/components/budget/BudgetPlanner';

export const metadata: Metadata = { title: 'Budget MODA PE27 — ON EARTH B2B' };

export default async function BudgetPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  const ok = await isMeridiano361Org(session.user?.role, session.user?.organizationId);
  if (!ok) redirect('/home');

  return <BudgetPlanner />;
}
