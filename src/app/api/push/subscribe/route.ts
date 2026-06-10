import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';

async function requireCustomer(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.id || token.role !== 'CUSTOMER') return null;
  return token.id as string;
}

export async function GET(req: NextRequest) {
  const customerId = await requireCustomer(req);
  if (!customerId) return NextResponse.json({ subscribed: false });

  const count = await prisma.pushSubscription.count({ where: { customerId } });
  return NextResponse.json({ subscribed: count > 0 });
}

export async function POST(req: NextRequest) {
  const customerId = await requireCustomer(req);
  if (!customerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { endpoint, p256dh, auth } = body ?? {};
  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: 'Dati sottoscrizione non validi' }, { status: 400 });
  }

  try {
    await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: { p256dh, auth, customerId },
      create: { customerId, endpoint, p256dh, auth },
    });
  } catch (err) {
    console.error('[push/subscribe POST]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const customerId = await requireCustomer(req);
  if (!customerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await prisma.pushSubscription.deleteMany({ where: { customerId } });
  return NextResponse.json({ ok: true });
}
