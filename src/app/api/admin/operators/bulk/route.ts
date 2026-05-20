import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

const patchSchema = z.object({
  operatorIds: z.array(z.string()).min(1),
  action: z.enum(['activate', 'deactivate', 'resetPassword']),
});

const deleteSchema = z.object({
  operatorIds: z.array(z.string()).min(1),
});

function generatePassword(orgNome: string): string {
  const slug = orgNome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z]/g, '');
  return 'onearth_' + slug.substring(0, 5);
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { operatorIds, action } = patchSchema.parse(body);

  if (action === 'activate' || action === 'deactivate') {
    await prisma.operator.updateMany({
      where: { id: { in: operatorIds } },
      data: { attivo: action === 'activate' },
    });
    return NextResponse.json({ ok: true, count: operatorIds.length });
  }

  // resetPassword: need org name per operator to generate default password
  const operators = await prisma.operator.findMany({
    where: { id: { in: operatorIds } },
    include: { organization: { select: { nome: true } } },
  });

  const results: { name: string; email: string; password: string }[] = [];

  await Promise.all(
    operators.map(async (op) => {
      const password = generatePassword(op.organization.nome);
      const passwordHash = await bcrypt.hash(password, 12);
      await prisma.operator.update({ where: { id: op.id }, data: { passwordHash } });
      results.push({ name: `${op.nome} ${op.cognome}`, email: op.email, password });
    })
  );

  results.sort((a, b) => a.name.localeCompare(b.name, 'it'));
  return NextResponse.json({ ok: true, results });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { operatorIds } = deleteSchema.parse(body);

  await prisma.operator.deleteMany({ where: { id: { in: operatorIds } } });
  return NextResponse.json({ ok: true, count: operatorIds.length });
}
