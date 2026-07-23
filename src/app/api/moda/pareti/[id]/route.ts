import { NextRequest, NextResponse } from 'next/server';
import { requireModaSession, canAccessVisual } from '@/lib/modaServer';
import { isAdminRole } from '@/lib/roles';
import { prisma } from '@/lib/prisma';

async function guard() {
  const session = await requireModaSession();
  if (!session) return null;
  const ok = await canAccessVisual(session.user?.role, session.user?.organizationId, session.user?.email);
  return ok ? session : null;
}

function getOwnerId(session: NonNullable<Awaited<ReturnType<typeof guard>>>): string | null | 'empty' {
  if (isAdminRole(session.user.role)) return null;          // null = admin-owned rows
  return session.user.organizationId ?? 'empty';
}

function owns(parete: { organizationId: string | null }, ownerId: string | null | 'empty'): boolean {
  if (ownerId === 'empty') return false;
  return parete.organizationId === ownerId;
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await guard();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const ownerId = getOwnerId(session);
  const parete = await prisma.pareteAttrezzata.findUnique({ where: { id: params.id } });
  if (!parete || parete.collezione !== 'PE27' || !owns(parete, ownerId)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ data: parete });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await guard();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const ownerId = getOwnerId(session);
  const existing = await prisma.pareteAttrezzata.findUnique({ where: { id: params.id } });
  if (!existing || !owns(existing, ownerId)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.nome !== undefined) data.nome = body.nome;
  if (body.ordine !== undefined) data.ordine = body.ordine;
  if (body.configurazione !== undefined) data.configurazione = body.configurazione;
  if ('sourceOrderId' in body) data.sourceOrderId = body.sourceOrderId ?? null;
  if ('sourceCartId'  in body) data.sourceCartId  = body.sourceCartId  ?? null;

  const parete = await prisma.pareteAttrezzata.update({ where: { id: params.id }, data });
  return NextResponse.json({ data: parete });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await guard();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const ownerId = getOwnerId(session);
  const existing = await prisma.pareteAttrezzata.findUnique({ where: { id: params.id } });
  if (!existing || !owns(existing, ownerId)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await prisma.pareteAttrezzata.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
