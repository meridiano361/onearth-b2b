import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isMeridiano361Org } from '@/lib/modaServer';
import { prisma } from '@/lib/prisma';

async function requireM361() {
  const session = await getServerSession(authOptions);
  if (!session) return null;
  const ok = await isMeridiano361Org(session.user.role, session.user.organizationId);
  return ok ? session : null;
}

export async function GET() {
  if (!await requireM361()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const rows = await prisma.oeCestoFabbisogno.findMany();
  return NextResponse.json(rows);
}

export async function PATCH(req: NextRequest) {
  if (!await requireM361()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = await req.json();
  const { cestoCodice, emporio, giacenza, ordinato } = body;
  const data: { giacenza?: number; ordinato?: number } = {};
  if (giacenza !== undefined) data.giacenza = Number(giacenza);
  if (ordinato !== undefined) data.ordinato = Number(ordinato);
  const row = await prisma.oeCestoFabbisogno.upsert({
    where: { cestoCodice_emporio: { cestoCodice, emporio } },
    update: data,
    create: { cestoCodice, emporio, giacenza: data.giacenza ?? 0, ordinato: data.ordinato ?? 0 },
  });
  return NextResponse.json(row);
}
