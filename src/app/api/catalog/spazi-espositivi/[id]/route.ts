import { NextRequest, NextResponse } from 'next/server';
import { requireMondiEspositivi } from '@/lib/featureGuard';
import { prisma } from '@/lib/prisma';

const FORBIDDEN = NextResponse.json({ error: 'Forbidden' }, { status: 403 });

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const operatorId = await requireMondiEspositivi();
  if (!operatorId) return FORBIDDEN;

  const spazio = await prisma.spazioEspositivo.findFirst({
    where: { id: params.id, operatorId },
    select: { id: true },
  });
  if (!spazio) return NextResponse.json({ error: 'Spazio non trovato' }, { status: 404 });

  const body = await req.json();
  const updated = await prisma.spazioEspositivo.update({
    where: { id: params.id },
    data: {
      ...(body.nome !== undefined && { nome: String(body.nome) }),
      ...(body.posizione !== undefined && { posizione: Number(body.posizione) }),
    },
  });

  return NextResponse.json({ spazio: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const operatorId = await requireMondiEspositivi();
  if (!operatorId) return FORBIDDEN;

  const spazio = await prisma.spazioEspositivo.findFirst({
    where: { id: params.id, operatorId },
    select: { id: true },
  });
  if (!spazio) return NextResponse.json({ error: 'Spazio non trovato' }, { status: 404 });

  await prisma.spazioEspositivo.delete({ where: { id: params.id } });

  return NextResponse.json({ ok: true });
}
