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

    return NextResponse.json({
      count,
      pages: productPages + groupPages + coverPage + penultimaPage + finalPage,
      productPages,
      groupPages,
    });
  } catch (err) {
    console.error('[catalogo-pdf preview]', err);
    return NextResponse.json({ error: 'Errore' }, { status: 500 });
  }
}
