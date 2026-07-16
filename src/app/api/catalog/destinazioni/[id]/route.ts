import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const CANAL_TIPI = ['BOTTEGA', 'EMPORIO', 'DISTRETTO', 'STORE', 'OUTLET', 'TENDONE', 'FIERA', 'ONLINE', 'ALTRO'] as const;

const updateSchema = z.object({
  nome: z.string().optional().nullable(),
  tipo: z.enum(CANAL_TIPI).optional(),
  citta: z.string().optional().nullable(),
  indirizzo: z.string().optional().nullable(),
  budget: z.number().positive().optional().nullable(),
});

function buildNome(tipo: string, citta?: string | null) {
  return citta ? `${tipo} — ${citta}` : tipo;
}

function serialize(c: any) {
  return {
    ...c,
    budget: c.budget != null ? Number(c.budget) : null,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

async function resolveCanale(id: string, session: any) {
  if (session.user.role === 'CUSTOMER') {
    return prisma.canale.findFirst({ where: { id, customerId: session.user.id } });
  }
  const orgId = session.user.organizationId;
  if (!orgId) return null;
  return prisma.canale.findFirst({ where: { id, organizationId: orgId } });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const existing = await resolveCanale(params.id, session);
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json();
  const data = updateSchema.parse(body);

  const newTipo = data.tipo ?? existing.tipo;
  const newCitta = data.citta !== undefined ? data.citta?.trim() || null : existing.citta;
  const newNome = data.nome?.trim() || buildNome(newTipo, newCitta);

  const updated = await prisma.canale.update({
    where: { id: params.id },
    data: {
      nome: newNome,
      ...(data.tipo !== undefined && { tipo: data.tipo }),
      ...(data.citta !== undefined && { citta: data.citta?.trim() || null }),
      ...(data.indirizzo !== undefined && { indirizzo: data.indirizzo?.trim() || null }),
      ...(data.budget !== undefined && { budget: data.budget }),
    },
  });

  return NextResponse.json({ data: serialize(updated) });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const existing = await resolveCanale(params.id, session);
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await prisma.$transaction([
    prisma.order.updateMany({ where: { canaleId: params.id }, data: { canaleId: null } }),
    prisma.canale.delete({ where: { id: params.id } }),
  ]);

  return NextResponse.json({ ok: true });
}
