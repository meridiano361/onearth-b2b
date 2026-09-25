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
  const rows = await prisma.oeStrennaQta.findMany();
  return NextResponse.json(rows);
}

// PATCH body: { barcode, emporio, qta }
export async function PATCH(req: NextRequest) {
  if (!await requireM361()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { barcode, emporio, qta } = await req.json();
  if (!barcode || !emporio || qta === undefined) {
    return NextResponse.json({ error: 'Parametri mancanti' }, { status: 400 });
  }

  const row = await prisma.oeStrennaQta.upsert({
    where: { barcode_emporio: { barcode, emporio } },
    create: { barcode, emporio, qta: Number(qta) },
    update: { qta: Number(qta) },
  });
  return NextResponse.json(row);
}
