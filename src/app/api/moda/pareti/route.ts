import { NextRequest, NextResponse } from 'next/server';
import { requireModaSession, canAccessVisual } from '@/lib/modaServer';
import { prisma } from '@/lib/prisma';

async function guard() {
  const session = await requireModaSession();
  if (!session) return null;
  const ok = await canAccessVisual(session.user?.role, session.user?.organizationId);
  return ok ? session : null;
}

export async function GET() {
  if (!await guard()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const pareti = await prisma.pareteAttrezzata.findMany({
    where: { collezione: 'PE27' },
    orderBy: { ordine: 'asc' },
  });

  return NextResponse.json({ data: pareti });
}

export async function POST(req: NextRequest) {
  if (!await guard()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { nome } = body;
  if (!nome?.trim()) return NextResponse.json({ error: 'Nome obbligatorio' }, { status: 400 });

  const maxOrdine = await prisma.pareteAttrezzata.aggregate({
    _max: { ordine: true },
    where: { collezione: 'PE27' },
  });

  const parete = await prisma.pareteAttrezzata.create({
    data: {
      nome: nome.trim(),
      collezione: 'PE27',
      ordine: (maxOrdine._max.ordine ?? 0) + 1,
      configurazione: [],
    },
  });

  return NextResponse.json({ data: parete }, { status: 201 });
}
