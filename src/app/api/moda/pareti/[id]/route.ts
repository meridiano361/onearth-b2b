import { NextRequest, NextResponse } from 'next/server';
import { requireModaSession } from '@/lib/modaServer';
import { prisma } from '@/lib/prisma';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireModaSession();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const parete = await prisma.pareteAttrezzata.findUnique({ where: { id: params.id } });
  if (!parete || parete.collezione !== 'PE27') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ data: parete });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireModaSession();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.nome !== undefined) data.nome = body.nome;
  if (body.ordine !== undefined) data.ordine = body.ordine;
  if (body.configurazione !== undefined) data.configurazione = body.configurazione;

  const parete = await prisma.pareteAttrezzata.update({ where: { id: params.id }, data });
  return NextResponse.json({ data: parete });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireModaSession();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await prisma.pareteAttrezzata.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
