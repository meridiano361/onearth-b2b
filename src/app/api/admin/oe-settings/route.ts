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

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json() as Record<string, unknown>;
    for (const chiave of OE_KEYS) {
      const valore = body[chiave];
      if (typeof valore !== 'string') continue;
      await prisma.appSettings.upsert({
        where:  { chiave },
        update: { valore },
        create: { chiave, valore },
      });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[oe-settings PATCH]', err);
    return NextResponse.json({ error: 'Salvataggio fallito' }, { status: 500 });
  }
}
