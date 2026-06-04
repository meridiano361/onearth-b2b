import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { prisma } from '@/lib/prisma';

const KEYS = ['email_credenziali_oggetto', 'email_credenziali_corpo', 'email_credenziali_corpo_post'] as const;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const rows = await prisma.appSettings.findMany({ where: { chiave: { in: [...KEYS] } } });
  const config: Record<string, string> = {};
  for (const row of rows) config[row.chiave] = row.valore;
  return NextResponse.json({ data: config });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const body = await req.json();
  const entries = Object.entries(body as Record<string, string>)
    .filter(([k, v]) => KEYS.includes(k as any) && typeof v === 'string');

  await prisma.$transaction(
    entries.map(([chiave, valore]) =>
      prisma.appSettings.upsert({
        where: { chiave },
        update: { valore },
        create: { chiave, valore },
      })
    )
  );
  return NextResponse.json({ ok: true });
}
