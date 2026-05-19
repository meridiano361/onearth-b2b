import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

function requireSuperAdmin(role: string) {
  return role === 'SUPER_ADMIN';
}

const updateSchema = z.object({
  companyName: z.string().min(1).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'COMMERCIALE', 'MAGAZZINO']).optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !requireSuperAdmin(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const data = updateSchema.parse(body);

  const updateData: any = { ...data };
  if (data.password) {
    updateData.passwordHash = await bcrypt.hash(data.password, 10);
    delete updateData.password;
  }
  if (data.email) updateData.email = data.email.toLowerCase();

  const user = await prisma.customer.update({
    where: { id: params.id },
    data: updateData,
    select: { id: true, companyName: true, email: true, role: true, isActive: true, createdAt: true, customerCode: true },
  });

  return NextResponse.json({ data: { ...user, createdAt: user.createdAt.toISOString() } });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !requireSuperAdmin(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Prevent self-deletion
  if (params.id === session.user.id) {
    return NextResponse.json({ error: 'Non puoi eliminare il tuo account' }, { status: 400 });
  }

  await prisma.customer.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
