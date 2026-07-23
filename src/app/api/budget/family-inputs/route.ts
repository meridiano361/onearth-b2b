/**
 * PATCH /api/budget/family-inputs
 * Body: { famiglia, vendutoPrevValore?, vendutoPrevPezzi?, mesiConsuntivi?, obiettivo?, marginePieno?, scontoMese5?, scontoMese6? }
 * Upserts the family input row for the current org.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isMeridiano361Org } from '@/lib/modaServer';
import { prisma } from '@/lib/prisma';
import { BUDGET_SEASON, MODA_FAMIGLIE } from '@/lib/budget';
import { nanoid } from 'nanoid';

const FORBIDDEN = NextResponse.json({ error: 'Forbidden' }, { status: 403 });

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return FORBIDDEN;
  const ok = await isMeridiano361Org(session.user.role, session.user.organizationId);
  if (!ok) return FORBIDDEN;

  const orgId = session.user.organizationId!;
  const body = await req.json();
  const { famiglia } = body;

  if (!famiglia || !MODA_FAMIGLIE.includes(famiglia)) {
    return NextResponse.json({ error: 'famiglia non valida' }, { status: 400 });
  }

  function n(v: unknown): number | null {
    if (v === null || v === undefined || v === '') return null;
    const num = Number(v);
    return isNaN(num) ? null : num;
  }

  const data: Record<string, unknown> = { updatedAt: new Date() };
  if ('vendutoPrevValore' in body) data.vendutoPrevValore = n(body.vendutoPrevValore);
  if ('vendutoPrevPezzi'  in body) data.vendutoPrevPezzi  = body.vendutoPrevPezzi != null ? Math.round(Number(body.vendutoPrevPezzi)) : null;
  if ('mesiConsuntivi'    in body) data.mesiConsuntivi    = Math.max(1, Math.round(Number(body.mesiConsuntivi) || 4));
  if ('obiettivo'         in body) data.obiettivo         = n(body.obiettivo);
  if ('marginePieno'      in body) data.marginePieno      = n(body.marginePieno);
  if ('scontoMese5'       in body) data.scontoMese5       = n(body.scontoMese5);
  if ('scontoMese6'       in body) data.scontoMese6       = n(body.scontoMese6);

  const row = await prisma.budgetFamilyInput.upsert({
    where: { organizationId_seasonCode_famiglia: { organizationId: orgId, seasonCode: BUDGET_SEASON, famiglia } },
    create: { id: nanoid(), organizationId: orgId, seasonCode: BUDGET_SEASON, famiglia, ...data },
    update: data,
  });

  return NextResponse.json({
    famiglia: row.famiglia,
    vendutoPrevValore: row.vendutoPrevValore != null ? Number(row.vendutoPrevValore) : null,
    vendutoPrevPezzi: row.vendutoPrevPezzi,
    mesiConsuntivi: row.mesiConsuntivi,
    obiettivo: row.obiettivo != null ? Number(row.obiettivo) : null,
    marginePieno: row.marginePieno != null ? Number(row.marginePieno) : null,
    scontoMese5: row.scontoMese5 != null ? Number(row.scontoMese5) : null,
    scontoMese6: row.scontoMese6 != null ? Number(row.scontoMese6) : null,
  });
}
