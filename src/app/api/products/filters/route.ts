import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const FIELDS = [
  'stagione',
  'colore',
  'temaColore',
  'collezione',
  'tranche',
  'nomLinea',
  'famiglia',
  'sottofamiglia',
  'gruppoOmogeneo',
  'classe',
  'sottoclasse',
  'gruppoMerceologico',
  'produttore',
] as const;

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const results = await Promise.all(
      FIELDS.map(async (field) => {
        const rows = await (prisma.product as any).findMany({
          where: { isActive: true, [field]: { not: null } },
          select: { [field]: true },
          distinct: [field],
          orderBy: { [field]: 'asc' },
        });
        const values: string[] = rows.map((r: any) => r[field]).filter(Boolean);
        return [field, values] as const;
      })
    );

    return NextResponse.json({ data: Object.fromEntries(results) });
  } catch (err) {
    console.error('GET /api/products/filters error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
