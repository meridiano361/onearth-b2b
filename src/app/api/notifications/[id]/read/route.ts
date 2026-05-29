import { NextRequest, NextResponse } from 'next/server';
import { requireMondiEspositivi } from '@/lib/featureGuard';
import { prisma } from '@/lib/prisma';

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const operatorId = await requireMondiEspositivi();
  if (!operatorId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await prisma.notificationRead.upsert({
    where: { notificationId_operatorId: { notificationId: params.id, operatorId } },
    update: {},
    create: { notificationId: params.id, operatorId },
  });

  return NextResponse.json({ ok: true });
}
