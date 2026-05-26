import { NextRequest, NextResponse } from 'next/server';
import { requireMondiEspositivi } from '@/lib/featureGuard';
import { prisma } from '@/lib/prisma';

const FORBIDDEN = NextResponse.json({ error: 'Forbidden' }, { status: 403 });

export async function PUT(
  req: NextRequest,
  { params }: { params: { orderId: string; scheduleId: string } }
) {
  const operatorId = await requireMondiEspositivi();
  if (!operatorId) return FORBIDDEN;

  const body = await req.json();
  const { spazioId, anno, settimanaIn, settimanaFn, nota } = body as Record<string, unknown>;

  const schedule = await prisma.displayGroupSchedule.findFirst({
    where: { id: params.scheduleId, group: { orderId: params.orderId } },
    select: { id: true },
  });
  if (!schedule) return NextResponse.json({ error: 'Schedule non trovato' }, { status: 404 });

  const updated = await prisma.displayGroupSchedule.update({
    where: { id: params.scheduleId },
    data: {
      ...(spazioId !== undefined && { spazioId: spazioId ? String(spazioId) : null }),
      ...(anno !== undefined && { anno: Number(anno) }),
      ...(settimanaIn !== undefined && { settimanaIn: Number(settimanaIn) }),
      ...(settimanaFn !== undefined && { settimanaFn: Number(settimanaFn) }),
      nota: nota !== undefined ? (nota ? String(nota) : null) : undefined,
    },
  });

  return NextResponse.json({ schedule: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { orderId: string; scheduleId: string } }
) {
  const operatorId = await requireMondiEspositivi();
  if (!operatorId) return FORBIDDEN;

  const schedule = await prisma.displayGroupSchedule.findFirst({
    where: { id: params.scheduleId, group: { orderId: params.orderId } },
    select: { id: true },
  });
  if (!schedule) return NextResponse.json({ error: 'Schedule non trovato' }, { status: 404 });

  await prisma.displayGroupSchedule.delete({ where: { id: params.scheduleId } });

  return NextResponse.json({ ok: true });
}
