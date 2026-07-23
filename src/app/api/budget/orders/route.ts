/**
 * GET /api/budget/orders
 * Returns the list of non-cancelled MODA PE27 orders for the current org,
 * ordered by creation date desc, for use in the budget order selector.
 */
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isMeridiano361Org } from '@/lib/modaServer';
import { prisma } from '@/lib/prisma';
import { MODA_BRANCH_ID } from '@/lib/modaAccess';

const FORBIDDEN = NextResponse.json({ error: 'Forbidden' }, { status: 403 });

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return FORBIDDEN;
  const ok = await isMeridiano361Org(session.user.role, session.user.organizationId);
  if (!ok) return FORBIDDEN;

  const orgId = session.user.organizationId!;

  const orders = await prisma.order.findMany({
    where: {
      organizationId: orgId,
      catalogBranch: MODA_BRANCH_ID,
      status: { not: 'ANNULLATO' },
    },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      totalItems: true,
      createdAt: true,
      canale: { select: { nome: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({
    orders: orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      totalItems: o.totalItems,
      createdAt: o.createdAt.toISOString(),
      canaleNome: o.canale?.nome ?? null,
    })),
  });
}
