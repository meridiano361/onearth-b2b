import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';

async function resolveCustomerIdFromRequest(req: NextRequest, bodyEmail?: string): Promise<string | null> {
  // Try JWT token first
  try {
    const token = await getToken({ req });
    if (token?.email) {
      const customer = await prisma.customer.findUnique({ where: { email: String(token.email) }, select: { id: true } });
      if (customer) return customer.id;
    }
  } catch {}

  // Fallback: lookup by email sent from client
  if (bodyEmail) {
    const customer = await prisma.customer.findUnique({ where: { email: String(bodyEmail) }, select: { id: true } });
    if (customer) return customer.id;
  }

  return null;
}

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req });
    if (!token?.email) return NextResponse.json({ subscribed: false });
    const customer = await prisma.customer.findUnique({ where: { email: String(token.email) }, select: { id: true } });
    if (!customer) return NextResponse.json({ subscribed: false });
    const count = await prisma.pushSubscription.count({ where: { customerId: customer.id } });
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

  const { endpoint, p256dh, auth, email: bodyEmail } = body ?? {};

  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: 'Dati subscription mancanti' }, { status: 400 });
  }

  const customerId = await resolveCustomerIdFromRequest(req, bodyEmail as string | undefined);
  if (!customerId) {
    return NextResponse.json({ error: 'Cliente non trovato — rieffettua il login' }, { status: 401 });
  }

  try {
    await prisma.pushSubscription.deleteMany({ where: { endpoint: String(endpoint) } });
    await prisma.pushSubscription.create({
      data: { customerId, endpoint: String(endpoint), p256dh: String(p256dh), auth: String(auth) },
    });
  } catch (err: unknown) {
    const e = err as Record<string, unknown>;
    console.error('[push/subscribe POST]', err);
    return NextResponse.json({ error: `${e.code ?? ''} ${(e.meta as Record<string, unknown>)?.cause ?? ''} ${err instanceof Error ? err.message : String(err)}`.trim() }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  try {
    const token = await getToken({ req });
    if (!token?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const customer = await prisma.customer.findUnique({ where: { email: String(token.email) }, select: { id: true } });
    if (!customer) return NextResponse.json({ error: 'Cliente non trovato' }, { status: 404 });
    await prisma.pushSubscription.deleteMany({ where: { customerId: customer.id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
