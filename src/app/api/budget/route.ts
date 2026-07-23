/**
 * GET  /api/budget  — returns (or creates) the budget scenario for the org + season.
 * PATCH /api/budget — updates meta fields (nome, obiettivoTotale, costiNegozio, obiettivoRicavoSviluppo).
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

function toNum(v: unknown) { return v != null ? Number(v) : null; }

export async function GET(_req: NextRequest) {
  const session = await guardBudget();
  if (!session) return FORBIDDEN;

  const orgId = session.user.organizationId!;
  const season = BUDGET_SEASON;

  let meta = await prisma.budgetScenarioMeta.findUnique({
    where: { organizationId_seasonCode: { organizationId: orgId, seasonCode: season } },
  });
  if (!meta) {
    meta = await prisma.budgetScenarioMeta.create({
      data: { id: nanoid(), organizationId: orgId, seasonCode: season },
    });
  }

  const [familyInputs, subclassData] = await Promise.all([
    prisma.budgetFamilyInput.findMany({ where: { organizationId: orgId, seasonCode: season } }),
    prisma.budgetSubclassData.findMany({ where: { organizationId: orgId, seasonCode: season } }),
  ]);

  let settori = await prisma.budgetSettore.findMany({
    where: { organizationId: orgId, seasonCode: season },
    orderBy: { posizione: 'asc' },
  });

  if (settori.length === 0) {
    const created = await prisma.budgetSettore.create({
      data: { organizationId: orgId, seasonCode: season, nome: 'Moda PE27', incidenza: 0, margine: 0, posizione: 0 },
    });
    settori = [created];
  }

  const m = meta as any;
  return NextResponse.json({
    meta: {
      id: meta.id,
      nome: meta.nome,
      seasonCode: meta.seasonCode,
      obiettivoTotale:         toNum(m.obiettivoTotale),
      costiNegozio:            toNum(m.costiNegozio),
      obiettivoRicavoSviluppo: toNum(m.obiettivoRicavoSviluppo),
    },
    famiglie: MODA_FAMIGLIE,
    subclassesByFamiglia: MODA_SUBCLASSES,
    familyInputs: familyInputs.map((fi) => ({
      famiglia:         fi.famiglia,
      vendutoPrevValore: toNum(fi.vendutoPrevValore),
      vendutoPrevPezzi:  fi.vendutoPrevPezzi,
      mesiConsuntivi:    fi.mesiConsuntivi,
      obiettivo:         toNum(fi.obiettivo),
      marginePieno:      toNum(fi.marginePieno),
      scontoMese5:       toNum(fi.scontoMese5),
      scontoMese6:       toNum(fi.scontoMese6),
    })),
    subclassData: subclassData.map((sd) => ({
      famiglia:    sd.famiglia,
      sottoclasse: sd.sottoclasse,
      pezziPE26:   sd.pezziPE26,
      valorePE26:  toNum(sd.valorePE26),
      continuativi: sd.continuativi,
    })),
    settori: settori.map((s) => ({
      id:        s.id,
      nome:      s.nome,
      incidenza: Number(s.incidenza),
      margine:   Number(s.margine),
      posizione: s.posizione,
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
  if ('obiettivoTotale'         in body) update.obiettivoTotale         = body.obiettivoTotale == null ? null : Number(body.obiettivoTotale) || null;
  if ('costiNegozio'            in body) update.costiNegozio            = body.costiNegozio    == null ? null : Number(body.costiNegozio)    || null;
  if ('obiettivoRicavoSviluppo' in body) update.obiettivoRicavoSviluppo = body.obiettivoRicavoSviluppo == null ? null : Number(body.obiettivoRicavoSviluppo) || null;

  if (Object.keys(update).length === 0) return NextResponse.json({ error: 'nessun campo' }, { status: 400 });

  await prisma.budgetScenarioMeta.upsert({
    where: { organizationId_seasonCode: { organizationId: orgId, seasonCode: BUDGET_SEASON } },
    create: { id: nanoid(), organizationId: orgId, seasonCode: BUDGET_SEASON, nome: 'Budget principale', ...update },
    update,
  });

  return NextResponse.json({ ok: true });
}
