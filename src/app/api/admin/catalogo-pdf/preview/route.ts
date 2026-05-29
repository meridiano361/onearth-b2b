import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const role = session.user.role;
    if (role !== 'SUPER_ADMIN' && role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();

    const where: any = {};
    if (body.soloAttivi !== false) where.isActive = true;

    const filterFields = [
      'gruppoMerceologico', 'famiglia', 'classe', 'sottoclasse',
      'gruppoOmogeneo', 'nomLinea', 'collezione', 'colore',
      'produttore', 'tranche',
    ] as const;
    for (const f of filterFields) {
      if (body[f]) where[f] = body[f];
    }

    // Use dynamic colonne/righe if provided, else fall back to defaults
    const colonne = Math.max(1, Math.min(6, Number(body.colonne) || 4));
    const righe = Math.max(1, Math.min(10, Number(body.righe) || 6));
    const productsPerPage = colonne * righe;

    const count = await prisma.product.count({ where });
    const productPages = Math.ceil(count / productsPerPage);

    // Calculate group pages if grouping is active
    let groupPages = 0;
    const modalitaSeparatore: string = body.modalitaSeparatore ?? 'pagina-intera';

    if (body.raggruppa && count > 0) {
      // Only pagina-intera adds extra separator pages
      if (modalitaSeparatore === 'pagina-intera') {
        const groupField = body.raggruppa;
        const groups = await prisma.product.groupBy({
          by: [groupField as any],
          where,
          _count: { id: true },
        });
        groupPages = groups.length;
      }
    }

    // Add cover/final pages to estimate
    const coverPage = body.copertina?.attiva ? 1 : 0;
    const penultimaPage = body.paginaPenultima?.attiva ? 1 : 0;
    const finalPage = body.paginaFinale?.attiva ? 1 : 0;

    // Tranche stats
    let trancheStats: { tranche: string; count: number }[] | null = null;
    let trancheSepPages = 0;
    if (body.suddividiPerTranche && count > 0) {
      const trancheRows = await prisma.product.groupBy({
        by: ['tranche'],
        where,
        _count: { id: true },
      });
      trancheStats = trancheRows
        .filter((r) => r.tranche !== null || body.includeTrancheSenzaNome)
        .map((r) => ({ tranche: r.tranche ?? 'Non assegnato', count: r._count.id }))
        .sort((a, b) => a.tranche.localeCompare(b.tranche, 'it'));
      if (body.separatoreTrancheAttivo !== false) {
        trancheSepPages = trancheStats.length;
      }
    }

    // Photo stats (only when foto field is enabled)
    let fotoStats: { senza: number; una: number; multiple: number } | null = null;
    if (body.campi?.foto && count > 0) {
      const products = await prisma.product.findMany({
        where,
        select: { imageUrl: true, imageUrl2: true, imageUrl3: true, imageUrl4: true },
      });
      let senza = 0, una = 0, multiple = 0;
      for (const p of products) {
        const cnt = [p.imageUrl, p.imageUrl2, p.imageUrl3, p.imageUrl4].filter(Boolean).length;
        if (cnt === 0) senza++;
        else if (cnt === 1) una++;
        else multiple++;
      }
      fotoStats = { senza, una, multiple };
    }

    return NextResponse.json({
      count,
      pages: productPages + groupPages + trancheSepPages + coverPage + penultimaPage + finalPage,
      productPages,
      groupPages,
      trancheSepPages,
      trancheStats,
      fotoStats,
    });
  } catch (err) {
    console.error('[catalogo-pdf preview]', err);
    return NextResponse.json({ error: 'Errore' }, { status: 500 });
  }
}
