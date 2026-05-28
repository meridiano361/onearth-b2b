import { NextRequest, NextResponse } from 'next/server';
import { requireMondiEspositivi } from '@/lib/featureGuard';
import { prisma } from '@/lib/prisma';

const FORBIDDEN = NextResponse.json({ error: 'Forbidden' }, { status: 403 });

export async function PUT(
  req: NextRequest,
  { params }: { params: { orderId: string; groupId: string } }
) {
  const operatorId = await requireMondiEspositivi();
  if (!operatorId) return FORBIDDEN;

  const body = await req.json();
  const items: { orderItemId: string; posizione: number }[] = body.items ?? [];

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'items obbligatorio' }, { status: 400 });
  }

  await prisma.$transaction(
    items.map(({ orderItemId, posizione }) =>
      prisma.displayGroupItem.updateMany({
        where: { groupId: params.groupId, orderItemId },
        data: { posizione },
      })
    )
  );

  return NextResponse.json({ ok: true });
}
