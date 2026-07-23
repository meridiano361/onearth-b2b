/**
 * GET  /api/budget  — returns (or creates) the budget scenario for the org + season.
 * PATCH /api/budget — updates meta fields (nome, obiettivoTotale).
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isMeridiano361Org } from '@/lib/modaServer';
import { prisma } from '@/lib/prisma';
import { BUDGET_SEASON, MODA_FAMIGLIE, MODA_SUBCLASSES } from '@/lib/budget';
import { nanoid } from 'nanoid';

const FORBIDDEN = NextResponse.json({ error: 'Forbidden' }, { status: 403 });

async function guardBudget() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const ok = await isMeridiano361Org(session.user.role, session.user.organizationId);
  return ok ? session : null;
}

export async function GET(_req: NextRequest) {
  const session = await guardBudget();
  if (!session) return FORBIDDEN;

  const orgId = session.user.organizationId!;
  const season = BUDGET_SEASON;

  // Upsert scenario meta
  let meta = await prisma.budgetScenarioMeta.findUnique({
    where: { organizationId_seasonCode: { organizationId: orgId, seasonCode: season } },
  });
  if (!meta) {
    meta = await prisma.budgetScenarioMeta.create({
      data: { id: nanoid(), organizationId: orgId, seasonCode: season },
    });
  }

  // Fetch existing family inputs
  const familyInputs = await prisma.budgetFamilyInput.findMany({
    where: { organizationId: orgId, seasonCode: season },
  });

  // Fetch existing subclass data
  const subclassData = await prisma.budgetSubclassData.findMany({
    where: { organizationId: orgId, seasonCode: season },
  });

  return NextResponse.json({
    meta: {
      id: meta.id,
      nome: meta.nome,
      seasonCode: meta.seasonCode,
      obiettivoTotale: (meta as any).obiettivoTotale != null ? Number((meta as any).obiettivoTotale) : null,
    },
    famiglie: MODA_FAMIGLIE,
    subclassesByFamiglia: MODA_SUBCLASSES,
    familyInputs: familyInputs.map((fi) => ({
      famiglia: fi.famiglia,
      vendutoPrevValore: fi.vendutoPrevValore != null ? Number(fi.vendutoPrevValore) : null,
      vendutoPrevPezzi: fi.vendutoPrevPezzi,
      mesiConsuntivi: fi.mesiConsuntivi,
      obiettivo: fi.obiettivo != null ? Number(fi.obiettivo) : null,
      marginePieno: fi.marginePieno != null ? Number(fi.marginePieno) : null,
      scontoMese5: fi.scontoMese5 != null ? Number(fi.scontoMese5) : null,
      scontoMese6: fi.scontoMese6 != null ? Number(fi.scontoMese6) : null,
    })),
    subclassData: subclassData.map((sd) => ({
      famiglia: sd.famiglia,
      sottoclasse: sd.sottoclasse,
      pezziPE26: sd.pezziPE26,
      valorePE26: sd.valorePE26 != null ? Number(sd.valorePE26) : null,
      continuativi: sd.continuativi,
    })),
  });
}

export async function PATCH(req: NextRequest) {
  const session = await guardBudget();
  if (!session) return FORBIDDEN;

  const orgId = session.user.organizationId!;
  const body = await req.json();

  const update: Record<string, unknown> = {};
  if (typeof body.nome === 'string' && body.nome.trim()) update.nome = body.nome.trim();
  if ('obiettivoTotale' in body) {
    update.obiettivoTotale = body.obiettivoTotale == null ? null : Number(body.obiettivoTotale) || null;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'nessun campo da aggiornare' }, { status: 400 });
  }

  await prisma.budgetScenarioMeta.upsert({
    where: { organizationId_seasonCode: { organizationId: orgId, seasonCode: BUDGET_SEASON } },
    create: { id: nanoid(), organizationId: orgId, seasonCode: BUDGET_SEASON, nome: 'Budget principale', ...update },
    update,
  });

  return NextResponse.json({ ok: true });
}
