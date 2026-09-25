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

// PATCH body: { prodottoId, ordinato }
export async function PATCH(req: NextRequest) {
  if (!await requireM361()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { prodottoId, ordinato } = await req.json();
  if (!prodottoId || ordinato === undefined) {
    return NextResponse.json({ error: 'Parametri mancanti' }, { status: 400 });
  }

  const row = await prisma.oeAlimentariOrdinato.upsert({
    where: { prodottoId },
    create: { prodottoId, ordinato: Number(ordinato) },
    update: { ordinato: Number(ordinato) },
  });
  return NextResponse.json(row);
}
