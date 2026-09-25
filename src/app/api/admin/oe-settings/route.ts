import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { prisma } from '@/lib/prisma';

const OE_KEYS = [
  'oe.alimentari.fotoUrl',
  'oe.alimentari.sottotitolo',
  'oe.alimentari.titolo',
  'oe.benessere.fotoUrl',
  'oe.benessere.sottotitolo',
  'oe.benessere.titolo',
] as const;

async function requireAuth() {
  const session = await getServerSession(authOptions);
  if (!session) return null;
  if (isAdminRole(session.user.role)) return session;
  if (session.user.isMeridiano361) return session;
  return null;
}

export async function GET() {
  if (!await requireAuth()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const rows = await prisma.appSettings.findMany({ where: { chiave: { in: [...OE_KEYS] } } });
  const result = Object.fromEntries(rows.map(r => [r.chiave, r.valore]));
  return NextResponse.json(result);
}

export async function PATCH(req: NextRequest) {
  if (!await requireAuth()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await req.json() as Record<string, unknown>;
    const saved: string[] = [];
    for (const chiave of OE_KEYS) {
      const valore = body[chiave];
      if (typeof valore !== 'string') continue;
      await prisma.appSettings.upsert({
        where:  { chiave },
        update: { valore },
        create: { chiave, valore },
      });
      saved.push(chiave);
    }
    return NextResponse.json({ ok: true, saved });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[oe-settings PATCH]', msg);
    return NextResponse.json({ error: `Salvataggio fallito: ${msg}` }, { status: 500 });
  }
}
