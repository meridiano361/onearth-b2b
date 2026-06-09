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
  if (!customerId) return NextResponse.json({ subscribed: false });

  const count = await prisma.pushSubscription.count({ where: { customerId } });
  return NextResponse.json({ subscribed: count > 0 });
}

export async function POST(req: NextRequest) {
  const customerId = await requireCustomer();
  if (!customerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { endpoint, p256dh, auth } = body ?? {};
  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: 'Dati sottoscrizione non validi' }, { status: 400 });
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    update: { p256dh, auth, customerId },
    create: { customerId, endpoint, p256dh, auth },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const customerId = await requireCustomer();
  if (!customerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await prisma.pushSubscription.deleteMany({ where: { customerId } });
  return NextResponse.json({ ok: true });
}
