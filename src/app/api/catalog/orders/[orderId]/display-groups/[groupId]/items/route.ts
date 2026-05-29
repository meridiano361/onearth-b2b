import { NextRequest, NextResponse } from 'next/server';
import { requireMondiEspositivi } from '@/lib/featureGuard';
import { prisma } from '@/lib/prisma';

const FORBIDDEN = NextResponse.json({ error: 'Forbidden' }, { status: 403 });

export async function POST(req: NextRequest, { params }: { params: { orderId: string; groupId: string } }) {
  const operatorId = await requireMondiEspositivi();
  if (!operatorId) return FORBIDDEN;

  const body = await req.json();
  const orderItemIds: string[] = Array.isArray(body.orderItemIds)
    ? body.orderItemIds
    : body.orderItemId ? [body.orderItemId] : [];

  if (orderItemIds.length === 0) {
    return NextResponse.json({ error: 'orderItemId obbligatorio' }, { status: 400 });
  }

  // Verify all orderItems belong to this order
  const validItems = await prisma.orderItem.findMany({
    where: { id: { in: orderItemIds }, orderId: params.orderId },
    select: { id: true },
  });
  if (validItems.length === 0) {
    return NextResponse.json({ error: 'Nessun prodotto valido' }, { status: 400 });
  }

  const livello = typeof body.livello === 'number' && body.livello >= 1 ? body.livello : 1;

  const lastItem = await prisma.displayGroupItem.findFirst({
    where: { groupId: params.groupId },
    orderBy: { posizione: 'desc' },
    select: { posizione: true },
  });
  let posizione = (lastItem?.posizione ?? -1) + 1;

  await prisma.$transaction(
    validItems.map((item) =>
      prisma.displayGroupItem.upsert({
        where: { groupId_orderItemId: { groupId: params.groupId, orderItemId: item.id } },
        update: {},
        create: { groupId: params.groupId, orderItemId: item.id, posizione: posizione++, livello },
      })
    )
  );

  return NextResponse.json({ ok: true }, { status: 201 });
}
