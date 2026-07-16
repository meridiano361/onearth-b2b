import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { titleCase } from '@/lib/normalizeClassification';

const updateSchema = z.object({
  nome: z.string().min(1).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const data = updateSchema.parse(body);
  if (data.nome) data.nome = titleCase(data.nome);

  const org = await prisma.organization.update({
    where: { id: params.id },
    data,
  });

  return NextResponse.json({ data: { ...org, createdAt: org.createdAt.toISOString() } });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await prisma.$transaction([
    prisma.order.updateMany({ where: { organizationId: params.id }, data: { organizationId: null } }),
    prisma.organization.delete({ where: { id: params.id } }),
  ]);
  return NextResponse.json({ ok: true });
}
