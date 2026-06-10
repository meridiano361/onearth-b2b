import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const [totaleAttivi, conPush] = await Promise.all([
    prisma.customer.count({ where: { isActive: true } }),
    prisma.customer.count({
      where: {
        isActive: true,
        pushSubscriptions: { some: {} },
      },
    }),
  ]);

  return NextResponse.json({ totaleAttivi, conPush, senzaPush: totaleAttivi - conPush });
}
