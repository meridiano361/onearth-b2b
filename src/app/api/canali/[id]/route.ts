import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateSchema = z.object({
  nome: z.string().min(1).optional(),
  tipo: z.enum(['BOTTEGA', 'TENDONE', 'ONLINE', 'ALTRO']).optional(),
  citta: z.string().optional().nullable(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const data = updateSchema.parse(body);

  const canale = await prisma.canale.update({
    where: { id: params.id },
    data,
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
