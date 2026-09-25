import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isMeridiano361Org } from '@/lib/modaServer';

async function requireM361() {
  const session = await getServerSession(authOptions);
  if (!session) return null;
  const ok = await isMeridiano361Org(session.user.role, session.user.organizationId);
  return ok ? session : null;
}

export async function GET() {
  if (!await requireM361()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const rows = await prisma.oeCestoGiacenza.findMany();
  return NextResponse.json(rows);
}

// PATCH body: { cestoCodice, negozio, qta }
export async function PATCH(req: NextRequest) {
  if (!await requireM361()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { cestoCodice, negozio, qta } = await req.json();
  if (!cestoCodice || !negozio || qta === undefined) {
    return NextResponse.json({ error: 'Parametri mancanti' }, { status: 400 });
  }

  const row = await prisma.oeCestoGiacenza.upsert({
    where: { cestoCodice_negozio: { cestoCodice, negozio } },
    create: { cestoCodice, negozio, qta: Number(qta) },
    update: { qta: Number(qta) },
  });
  return NextResponse.json(row);
}
