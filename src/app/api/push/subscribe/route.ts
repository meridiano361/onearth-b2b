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
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 });
  }

  const { endpoint, p256dh, auth, customerId } = body ?? {};

  if (!endpoint || !p256dh || !auth || !customerId) {
    return NextResponse.json({
      error: `Dati mancanti: endpoint=${!!endpoint} p256dh=${!!p256dh} auth=${!!auth} cid=${!!customerId}`,
    }, { status: 400 });
  }

  try {
    await prisma.pushSubscription.deleteMany({ where: { endpoint: String(endpoint) } });
    await prisma.pushSubscription.create({
      data: {
        customerId: String(customerId),
        endpoint: String(endpoint),
        p256dh: String(p256dh),
        auth: String(auth),
      },
    });
  } catch (err: unknown) {
    const details =
      err instanceof Error
        ? { message: err.message, name: err.name, code: (err as unknown as Record<string, unknown>).code, meta: (err as unknown as Record<string, unknown>).meta }
        : { raw: String(err) };
    console.error('[push/subscribe POST]', details);
    return NextResponse.json({ error: JSON.stringify(details) }, { status: 500 });
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
