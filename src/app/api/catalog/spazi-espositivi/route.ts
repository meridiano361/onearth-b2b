import { NextRequest, NextResponse } from 'next/server';
import { requireMondiEspositivi } from '@/lib/featureGuard';
import { prisma } from '@/lib/prisma';

const FORBIDDEN = NextResponse.json({ error: 'Forbidden' }, { status: 403 });

export async function GET() {
  const operatorId = await requireMondiEspositivi();
  if (!operatorId) return FORBIDDEN;

  const spazi = await prisma.spazioEspositivo.findMany({
    where: { operatorId },
    orderBy: { posizione: 'asc' },
  });

  return NextResponse.json({ spazi });
}

export async function POST(req: NextRequest) {
  const operatorId = await requireMondiEspositivi();
  if (!operatorId) return FORBIDDEN;

  const { nome } = await req.json();
  if (!nome) return NextResponse.json({ error: 'Nome obbligatorio' }, { status: 400 });

  const last = await prisma.spazioEspositivo.findFirst({
    where: { operatorId },
    orderBy: { posizione: 'desc' },
    select: { posizione: true },
  });

  const spazio = await prisma.spazioEspositivo.create({
    data: { operatorId, nome: String(nome), posizione: (last?.posizione ?? -1) + 1 },
  });

  return NextResponse.json({ spazio }, { status: 201 });
}
