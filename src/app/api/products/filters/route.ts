import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function distinct(
  field: 'stagione' | 'colore' | 'temaColore' | 'collezione' | 'tranche' |
         'nomLinea' | 'famiglia' | 'sottofamiglia' | 'gruppoOmogeneo' |
         'classe' | 'sottoclasse' | 'gruppoMerceologico' | 'produttore' | 'conferente'
): Promise<string[]> {
  const rows = await prisma.product.findMany({
    where: { isActive: true, [field]: { not: null } },
    select: { [field]: true } as Record<typeof field, true>,
    distinct: [field],
    orderBy: { [field]: 'asc' } as Record<typeof field, 'asc'>,
  });
  return rows.map((r) => (r as any)[field] as string).filter(Boolean);
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const [
      stagione,
      colore,
      temaColore,
      collezione,
      tranche,
      nomLinea,
      famiglia,
      sottofamiglia,
      gruppoOmogeneo,
      classe,
      sottoclasse,
      gruppoMerceologico,
      produttore,
      conferente,
    ] = await Promise.all([
      distinct('stagione'),
      distinct('colore'),
      distinct('temaColore'),
      distinct('collezione'),
      distinct('tranche'),
      distinct('nomLinea'),
      distinct('famiglia'),
      distinct('sottofamiglia'),
      distinct('gruppoOmogeneo'),
      distinct('classe'),
      distinct('sottoclasse'),
      distinct('gruppoMerceologico'),
      distinct('produttore'),
      distinct('conferente'),
    ]);

    return NextResponse.json({
      data: {
        stagione,
        colore,
        temaColore,
        collezione,
        tranche,
        nomLinea,
        famiglia,
        sottofamiglia,
        gruppoOmogeneo,
        classe,
        sottoclasse,
        gruppoMerceologico,
        produttore,
        conferente,
      },
    });
  } catch (err) {
    console.error('GET /api/products/filters error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
