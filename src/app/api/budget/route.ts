/**
 * GET  /api/budget  — returns (or creates) the budget scenario for the org + season.
 * PATCH /api/budget — updates the scenario name.
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
    meta: { id: meta.id, nome: meta.nome, seasonCode: meta.seasonCode },
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
      pezziPE25: sd.pezziPE25,
      pezziPE26: sd.pezziPE26,
      continuativi: sd.continuativi,
    })),
  });
}

export async function PATCH(req: NextRequest) {
  const session = await guardBudget();
  if (!session) return FORBIDDEN;

  const orgId = session.user.organizationId!;
  const body = await req.json();
  const nome = typeof body.nome === 'string' ? body.nome.trim() : null;
  if (!nome) return NextResponse.json({ error: 'nome required' }, { status: 400 });

  await prisma.budgetScenarioMeta.upsert({
    where: { organizationId_seasonCode: { organizationId: orgId, seasonCode: BUDGET_SEASON } },
    create: { id: nanoid(), organizationId: orgId, seasonCode: BUDGET_SEASON, nome },
    update: { nome },
  });

  return NextResponse.json({ ok: true });
}
