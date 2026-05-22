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

    const count = await prisma.product.count({ where });
    const pages = Math.ceil(count / 24);

    // Calculate group pages if grouping is active
    let groupPages = 0;
    if (body.raggruppa && count > 0) {
      const groupField = body.raggruppa;
      const groups = await prisma.product.groupBy({
        by: [groupField as any],
        where,
        _count: { id: true },
      });
      groupPages = groups.length;
    }

    return NextResponse.json({
      count,
      pages: pages + groupPages,
      productPages: pages,
      groupPages,
    });
  } catch (err) {
    console.error('[catalogo-pdf preview]', err);
    return NextResponse.json({ error: 'Errore' }, { status: 500 });
  }
}
