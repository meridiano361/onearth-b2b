import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const CANAL_TIPI = ['BOTTEGA', 'EMPORIO', 'DISTRETTO', 'STORE', 'OUTLET', 'TENDONE', 'FIERA', 'ONLINE', 'ALTRO'] as const;

const updateSchema = z.object({
  nome: z.string().min(1).optional(),
  tipo: z.enum(CANAL_TIPI).optional(),
  citta: z.string().optional().nullable(),
});

function serialize(c: any) {
  return { ...c, createdAt: c.createdAt.toISOString(), updatedAt: c.updatedAt.toISOString() };
}

async function resolveCanale(id: string, orgId: string) {
  const canale = await prisma.canale.findFirst({ where: { id, organizationId: orgId } });
  return canale;
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'OPERATOR' || !session.user.organizationId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const existing = await resolveCanale(params.id, session.user.organizationId);
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json();
  const data = updateSchema.parse(body);

  const updated = await prisma.canale.update({
    where: { id: params.id },
    data: {
      ...(data.nome !== undefined && { nome: data.nome.trim() }),
      ...(data.tipo !== undefined && { tipo: data.tipo }),
      ...(data.citta !== undefined && { citta: data.citta?.trim() || null }),
    },
  });

  return NextResponse.json({ data: serialize(updated) });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'OPERATOR' || !session.user.organizationId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const existing = await resolveCanale(params.id, session.user.organizationId);
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Null out orders referencing this canale before deleting
  await prisma.$transaction([
    prisma.order.updateMany({ where: { canaleId: params.id }, data: { canaleId: null } }),
    prisma.canale.delete({ where: { id: params.id } }),
  ]);

  return NextResponse.json({ ok: true });
}
