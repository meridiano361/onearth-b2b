import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { generateDefaultPassword } from '@/lib/password';
import { sendCredenziali } from '@/lib/email';

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const customer = await prisma.customer.findUnique({
    where: { id: params.id },
    select: { companyName: true, email: true },
  });
  if (!customer) return NextResponse.json({ error: 'Non trovato' }, { status: 404 });

  const password = generateDefaultPassword(customer.companyName);
  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.customer.update({
    where: { id: params.id },
    data: { passwordHash },
  });

  const { sent, error } = await sendCredenziali({
    nome: customer.companyName,
    email: customer.email,
    password,
    orgNome: customer.companyName,
  });

  if (!sent) {
    return NextResponse.json({ error: `Email non inviata: ${error}` }, { status: 500 });
  }

  return NextResponse.json({ ok: true, email: customer.email });
}
