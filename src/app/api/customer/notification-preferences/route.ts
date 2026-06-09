import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function requireCustomer() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'CUSTOMER') return null;
  return session.user.id;
}

export async function GET() {
  const customerId = await requireCustomer();
  if (!customerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { notificationsEnabled: true },
  });

  return NextResponse.json({ notificationsEnabled: customer?.notificationsEnabled ?? true });
}

export async function PATCH(req: NextRequest) {
  const customerId = await requireCustomer();
  if (!customerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  if (typeof body.notificationsEnabled !== 'boolean') {
    return NextResponse.json({ error: 'Parametro non valido' }, { status: 400 });
  }

  await prisma.customer.update({
    where: { id: customerId },
    data: { notificationsEnabled: body.notificationsEnabled },
  });

  return NextResponse.json({ ok: true });
}
