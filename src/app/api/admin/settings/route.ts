import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { prisma } from '@/lib/prisma';

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const entries = Object.entries(body as Record<string, string>).filter(
    ([, v]) => typeof v === 'string'
  );

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
