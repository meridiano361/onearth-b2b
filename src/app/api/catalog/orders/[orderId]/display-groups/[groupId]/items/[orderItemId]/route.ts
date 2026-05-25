import { NextRequest, NextResponse } from 'next/server';
import { requireMondiEspositivi } from '@/lib/featureGuard';
import { prisma } from '@/lib/prisma';

const FORBIDDEN = NextResponse.json({ error: 'Forbidden' }, { status: 403 });

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { orderId: string; groupId: string; orderItemId: string } }
) {
  const operatorId = await requireMondiEspositivi();
  if (!operatorId) return FORBIDDEN;

  await prisma.displayGroupItem.deleteMany({
    where: { groupId: params.groupId, orderItemId: params.orderItemId },
  });

  return NextResponse.json({ ok: true });
}
