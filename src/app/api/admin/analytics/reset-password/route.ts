import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { sendCredenziali } from '@/lib/email';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session) return null;
  if (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'ADMIN') return null;
  return session;
}

function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let pwd = '';
  for (let i = 0; i < 8; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
  return pwd;
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { operatorId, sendEmail } = await req.json() as { operatorId: string; sendEmail: boolean };

  const operator = await prisma.operator.findUnique({
    where: { id: operatorId },
    include: { organization: { select: { nome: true } } },
  });
  if (!operator) return NextResponse.json({ error: 'Operatore non trovato' }, { status: 404 });

  const newPassword = generatePassword();
  const hash = await bcrypt.hash(newPassword, 10);

  await prisma.operator.update({
    where: { id: operatorId },
    data: { passwordHash: hash },
  });

  if (sendEmail) {
    await sendCredenziali({
      nome: operator.nome,
      email: operator.email,
      password: newPassword,
      orgNome: operator.organization.nome,
    });
  }

  return NextResponse.json({ password: newPassword, email: operator.email });
}
