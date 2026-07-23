/**
 * GET /api/budget/margini-suggeriti
 * Returns the suggested marginePieno per famiglia, weighted by product count,
 * derived from condizioni_commerciali for each conferente in PE27.
 */
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isMeridiano361Org } from '@/lib/modaServer';
import { prisma } from '@/lib/prisma';
import { MODA_FAMIGLIE } from '@/lib/budget';

const FORBIDDEN = NextResponse.json({ error: 'Forbidden' }, { status: 403 });

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return FORBIDDEN;
  const ok = await isMeridiano361Org(session.user.role, session.user.organizationId);
  if (!ok) return FORBIDDEN;

  // Count products per famiglia × conferente
  const groups = await prisma.product.groupBy({
    by: ['famiglia', 'conferente'],
    where: {
      famiglia: { in: [...MODA_FAMIGLIE] },
      conferente: { not: null },
      isActive: true,
    },
    _count: { id: true },
  });

  // Fetch condizioni for each unique conferente in PE27
  const conferenti = [...new Set(groups.map((g) => g.conferente!))];
  const condizioni = await prisma.condizioniCommerciali.findMany({
    where: { conferente: { in: conferenti }, collezione: 'PE27' },
    select: { conferente: true, scontoConReso: true, scontoSenzaReso: true },
  });
  const condizioniMap = new Map(condizioni.map((c) => [c.conferente, c]));

  // Weighted average margin per famiglia
  const result: Record<string, number | null> = {};
  for (const famiglia of MODA_FAMIGLIE) {
    const famGroups = groups.filter((g) => g.famiglia === famiglia);
    let totalWeight = 0;
    let weightedSum = 0;
    for (const g of famGroups) {
      const cc = condizioniMap.get(g.conferente!);
      if (!cc) continue;
      const margin = cc.scontoConReso ?? cc.scontoSenzaReso ?? null;
      if (margin == null) continue;
      const w = g._count.id;
      weightedSum += margin * w;
      totalWeight += w;
    }
    result[famiglia] = totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 10) / 10 : null;
  }

  return NextResponse.json(result);
}
