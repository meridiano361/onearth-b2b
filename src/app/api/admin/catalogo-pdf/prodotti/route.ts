import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const sp = req.nextUrl.searchParams;
    const where: any = {};
    if (sp.get('soloAttivi') !== 'false') where.isActive = true;

    const filterFields = [
      'gruppoMerceologico', 'famiglia', 'classe', 'sottoclasse',
      'gruppoOmogeneo', 'nomLinea', 'collezione', 'colore',
      'produttore', 'tranche',
    ] as const;
    for (const f of filterFields) {
      const v = sp.get(f);
      if (v) where[f] = v;
    }

    const products = await prisma.product.findMany({
      where,
      select: { id: true, code: true, name: true, modello: true },
      orderBy: [{ modello: 'asc' }, { code: 'asc' }],
    });

    return NextResponse.json({ products });
  } catch (err) {
    console.error('[catalogo-pdf prodotti]', err);
    return NextResponse.json({ error: 'Errore' }, { status: 500 });
  }
}
