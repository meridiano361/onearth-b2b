import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

const updateSchema = z.object({
  nome: z.string().min(1).optional(),
  cognome: z.string().min(1).optional(),
  email: z.string().email().optional(),
  telefono: z.string().optional().nullable(),
  attivo: z.boolean().optional(),
  newPassword: z.string().min(6).optional().or(z.literal('')),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const data = updateSchema.parse(body);

  const updateData: any = { ...data };
  delete updateData.newPassword;
  if (data.newPassword) {
    updateData.passwordHash = await bcrypt.hash(data.newPassword, 12);
  }
  if (data.email) updateData.email = data.email.toLowerCase();

  const operator = await prisma.operator.update({
    where: { id: params.id },
    data: updateData,
    select: {
      id: true, nome: true, cognome: true, email: true,
      telefono: true, attivo: true, organizationId: true, createdAt: true,
    },
  });

  return NextResponse.json({ data: { ...operator, createdAt: operator.createdAt.toISOString() } });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await prisma.operator.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
