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

// PATCH body: { prodottoId, emporio, qta?, giacenza?, ordinato? }
export async function PATCH(req: NextRequest) {
  if (!await requireM361()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { prodottoId, emporio } = body;
  if (!prodottoId || !emporio) {
    return NextResponse.json({ error: 'Parametri mancanti' }, { status: 400 });
  }

  const update: { qta?: number; giacenza?: number; ordinato?: number } = {};
  const create: { prodottoId: string; emporio: string; qta: number; giacenza: number; ordinato: number } = {
    prodottoId, emporio, qta: 0, giacenza: 0, ordinato: 0,
  };

  if (body.qta !== undefined)       { update.qta = Number(body.qta);             create.qta = Number(body.qta); }
  if (body.giacenza !== undefined)  { update.giacenza = Number(body.giacenza);   create.giacenza = Number(body.giacenza); }
  if (body.ordinato !== undefined)  { update.ordinato = Number(body.ordinato);   create.ordinato = Number(body.ordinato); }

  const row = await prisma.oeAlimentariFabbisognoEmpori.upsert({
    where: { prodottoId_emporio: { prodottoId, emporio } },
    create,
    update,
  });
  return NextResponse.json(row);
}
