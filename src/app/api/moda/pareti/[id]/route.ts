import { NextRequest, NextResponse } from 'next/server';
import { requireModaSession, canAccessVisual } from '@/lib/modaServer';
import { isAdminRole } from '@/lib/roles';
import { prisma } from '@/lib/prisma';

async function guard() {
  const session = await requireModaSession();
  if (!session) return null;
  const ok = await canAccessVisual(session.user?.role, session.user?.organizationId);
  return ok ? session : null;
}

function orgFilter(session: Awaited<ReturnType<typeof guard>>) {
  if (!session) return null;
  if (isAdminRole(session.user.role)) return null;
  return session.user.organizationId ?? null;
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await guard();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const organizationId = orgFilter(session);
  const parete = await prisma.pareteAttrezzata.findUnique({ where: { id: params.id } });
  if (!parete || parete.collezione !== 'PE27' || parete.organizationId !== organizationId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ data: parete });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await guard();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const organizationId = orgFilter(session);
  const existing = await prisma.pareteAttrezzata.findUnique({ where: { id: params.id } });
  if (!existing || existing.organizationId !== organizationId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.nome !== undefined) data.nome = body.nome;
  if (body.ordine !== undefined) data.ordine = body.ordine;
  if (body.configurazione !== undefined) data.configurazione = body.configurazione;

  const parete = await prisma.pareteAttrezzata.update({ where: { id: params.id }, data });
  return NextResponse.json({ data: parete });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await guard();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const organizationId = orgFilter(session);
  const existing = await prisma.pareteAttrezzata.findUnique({ where: { id: params.id } });
  if (!existing || existing.organizationId !== organizationId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await prisma.pareteAttrezzata.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
