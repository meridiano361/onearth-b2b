import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

async function requireCustomer() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'CUSTOMER') return null;
  return session.user.id;
}

export async function POST(req: NextRequest) {
  const customerId = await requireCustomer();
  if (!customerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { currentPassword, newPassword } = await req.json();
  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: 'Parametri mancanti' }, { status: 400 });
  }
  if (typeof newPassword !== 'string' || newPassword.length < 6) {
    return NextResponse.json({ error: 'La nuova password deve essere di almeno 6 caratteri' }, { status: 400 });
  }

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { passwordHash: true },
  });
  if (!customer) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const valid = await bcrypt.compare(currentPassword, customer.passwordHash);
  if (!valid) return NextResponse.json({ error: 'Password attuale non corretta' }, { status: 400 });

  const newHash = await bcrypt.hash(newPassword, 12);
  await prisma.customer.update({ where: { id: customerId }, data: { passwordHash: newHash } });

  return NextResponse.json({ ok: true });
}
