import { NextRequest, NextResponse } from 'next/server';
import { requireMondiEspositivi } from '@/lib/featureGuard';
import { prisma } from '@/lib/prisma';

const FORBIDDEN = NextResponse.json({ error: 'Forbidden' }, { status: 403 });

export async function GET(_req: NextRequest, { params }: { params: { orderId: string } }) {
  const operatorId = await requireMondiEspositivi();
  if (!operatorId) return FORBIDDEN;

  const schedules = await prisma.displayGroupSchedule.findMany({
    where: { group: { orderId: params.orderId } },
    orderBy: { settimanaIn: 'asc' },
  });

  return NextResponse.json({ schedules });
}

export async function POST(req: NextRequest, { params }: { params: { orderId: string } }) {
  const operatorId = await requireMondiEspositivi();
  if (!operatorId) return FORBIDDEN;

  const body = await req.json();
  const { groupId, anno, settimanaIn, settimanaFn, nota } = body as Record<string, unknown>;

  if (!groupId || !anno || !settimanaIn) {
    return NextResponse.json({ error: 'Campi obbligatori mancanti' }, { status: 400 });
  }

  // Verify the group belongs to this order
  const group = await prisma.displayGroup.findFirst({
    where: { id: String(groupId), orderId: params.orderId },
    select: { id: true },
  });
  if (!group) return NextResponse.json({ error: 'Gruppo non trovato' }, { status: 404 });

  const schedule = await prisma.displayGroupSchedule.create({
    data: {
      groupId: String(groupId),
      anno: Number(anno),
      settimanaIn: Number(settimanaIn),
      settimanaFn: settimanaFn ? Number(settimanaFn) : Number(settimanaIn),
      nota: nota ? String(nota) : null,
    },
  });

  return NextResponse.json({ schedule }, { status: 201 });
}
