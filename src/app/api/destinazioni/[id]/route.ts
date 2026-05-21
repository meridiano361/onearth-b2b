import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateSchema = z.object({
  nome: z.string().min(1).optional().nullable(),
  tipo: z.enum(['BOTTEGA', 'EMPORIO', 'DISTRETTO', 'STORE', 'OUTLET', 'TENDONE', 'FIERA', 'ONLINE', 'ALTRO']).optional(),
  citta: z.string().optional().nullable(),
  indirizzo: z.string().optional().nullable(),
  budget: z.number().min(0).optional().nullable(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const data = updateSchema.parse(body);

  const existing = await prisma.canale.findUnique({ where: { id: params.id }, select: { tipo: true, citta: true } });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const newTipo = data.tipo ?? existing.tipo;
  const newCitta = data.citta !== undefined ? data.citta?.trim() || null : existing.citta;
  const nome = data.nome?.trim() || (newCitta ? `${newTipo} — ${newCitta}` : newTipo);

  const canale = await prisma.canale.update({
    where: { id: params.id },
    data: {
      nome,
      ...(data.tipo !== undefined && { tipo: data.tipo }),
      ...(data.citta !== undefined && { citta: data.citta?.trim() || null }),
      ...(data.indirizzo !== undefined && { indirizzo: data.indirizzo?.trim() || null }),
      ...(data.budget !== undefined && { budget: data.budget }),
    },
  });

  return NextResponse.json({
    data: { ...canale, createdAt: canale.createdAt.toISOString(), updatedAt: canale.updatedAt.toISOString() },
  });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await prisma.canale.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
