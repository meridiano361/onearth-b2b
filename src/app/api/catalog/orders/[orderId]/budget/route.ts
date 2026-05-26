import { NextRequest, NextResponse } from 'next/server';
import { requireMondiEspositivi } from '@/lib/featureGuard';
import { prisma } from '@/lib/prisma';

const FORBIDDEN = NextResponse.json({ error: 'Forbidden' }, { status: 403 });

export async function PATCH(
  req: NextRequest,
  { params }: { params: { orderId: string } }
) {
  const operatorId = await requireMondiEspositivi();
  if (!operatorId) return FORBIDDEN;

  const order = await prisma.order.findFirst({
    where: { id: params.orderId, operatorId },
    select: { id: true },
  });
  if (!order) return NextResponse.json({ error: 'Ordine non trovato' }, { status: 404 });

  const body = await req.json();
  const updated = await prisma.order.update({
    where: { id: params.orderId },
    data: {
      budgetPersonalizzato:
        body.budgetPersonalizzato !== undefined
          ? body.budgetPersonalizzato === null
            ? null
            : Number(body.budgetPersonalizzato)
          : undefined,
      budgetNota:
        body.budgetNota !== undefined
          ? body.budgetNota === null
            ? null
            : String(body.budgetNota)
          : undefined,
    },
    select: { id: true, budgetPersonalizzato: true, budgetNota: true },
  });

  return NextResponse.json({ order: updated });
}
