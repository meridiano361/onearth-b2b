/**
 * PUT  /api/budget/settori — replace the full settori list for this org+season
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isMeridiano361Org } from '@/lib/modaServer';
import { prisma } from '@/lib/prisma';
import { BUDGET_SEASON } from '@/lib/budget';

const FORBIDDEN = NextResponse.json({ error: 'Forbidden' }, { status: 403 });

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return FORBIDDEN;
  const ok = await isMeridiano361Org(session.user.role, session.user.organizationId);
  if (!ok) return FORBIDDEN;

  const orgId = session.user.organizationId!;
  const body = await req.json();
  const rows: { nome: string; incidenza: number; margine: number; posizione: number }[] = body.rows ?? [];

  // Deduplicate nomes to avoid unique constraint violations
  const seenNomi = new Set<string>();
  const safeRows = rows.map((r, idx) => {
    let nome = (r.nome ?? '').trim() || `Settore ${idx + 1}`;
    const base = nome;
    let suffix = 2;
    while (seenNomi.has(nome.toLowerCase())) nome = `${base} ${suffix++}`;
    seenNomi.add(nome.toLowerCase());
    return { ...r, nome };
  });

  // Full replace: delete existing, insert new list
  await prisma.$transaction([
    prisma.budgetSettore.deleteMany({ where: { organizationId: orgId, seasonCode: BUDGET_SEASON } }),
    ...safeRows.map((r) =>
      prisma.budgetSettore.create({
        data: {
          organizationId: orgId,
          seasonCode: BUDGET_SEASON,
          nome: r.nome,
          incidenza: r.incidenza,
          margine: r.margine,
          posizione: r.posizione,
        },
      })
    ),
  ]);

  return NextResponse.json({ ok: true });
}
