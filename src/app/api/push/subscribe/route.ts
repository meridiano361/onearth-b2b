import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';

async function resolveEmail(req: NextRequest, bodyEmail?: string): Promise<string | null> {
  try {
    const token = await getToken({ req });
    if (token?.email) return String(token.email);
  } catch {}
  return bodyEmail ? String(bodyEmail) : null;
}

export async function GET(req: NextRequest) {
  try {
    const email = await resolveEmail(req);
    if (!email) return NextResponse.json({ subscribed: false });
    const count = await prisma.pushSubscription.count({ where: { userEmail: email } });
    return NextResponse.json({ subscribed: count > 0 });
  } catch {
    return NextResponse.json({ subscribed: false });
  }
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Body non valido' }, { status: 400 }); }

  const { endpoint, p256dh, auth, email: bodyEmail } = body ?? {};
  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: 'Dati subscription mancanti' }, { status: 400 });
  }

  const userEmail = await resolveEmail(req, bodyEmail as string | undefined);
  if (!userEmail) return NextResponse.json({ error: 'Email non trovata — rieffettua il login' }, { status: 401 });

  try {
    await prisma.pushSubscription.deleteMany({ where: { endpoint: String(endpoint) } });
    await prisma.pushSubscription.create({
      data: { userEmail, endpoint: String(endpoint), p256dh: String(p256dh), auth: String(auth) },
    });
  } catch (err: unknown) {
    console.error('[push/subscribe POST]', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  try {
    const email = await resolveEmail(req);
    if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await prisma.pushSubscription.deleteMany({ where: { userEmail: email } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
