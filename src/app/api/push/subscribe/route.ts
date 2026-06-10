import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req });
    if (!token?.id || token.role !== 'CUSTOMER') return NextResponse.json({ subscribed: false });
    const count = await prisma.pushSubscription.count({ where: { customerId: token.id as string } });
    return NextResponse.json({ subscribed: count > 0 });
  } catch {
    return NextResponse.json({ subscribed: false });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { endpoint, p256dh, auth, customerId } = body ?? {};

  if (!endpoint || !p256dh || !auth || !customerId) {
    return NextResponse.json({ error: 'Dati mancanti' }, { status: 400 });
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
  try {
    const token = await getToken({ req });
    if (!token?.id || token.role !== 'CUSTOMER') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await prisma.pushSubscription.deleteMany({ where: { customerId: token.id as string } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
