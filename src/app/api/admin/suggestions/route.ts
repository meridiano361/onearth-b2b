import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { prisma } from '@/lib/prisma';
import { FANTASIA_OPTIONS, COLORE_OPTIONS } from '@/lib/productConstants';

const ALLOWED_FIELDS = [
  'produttore',
  'nomLinea',
  'stagione',
  'collezione',
  'colore',
  'temaColore',
  'gruppoMerceologico',
  'famiglia',
  'classe',
  'sottoclasse',
  'gruppoOmogeneo',
  'fasciaRicarico',
  'tranche',
  'modello',
  'lavorazione',
  'dettaglio',
  'fantasia',
] as const;

type AllowedField = (typeof ALLOWED_FIELDS)[number];

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const field = searchParams.get('field') as AllowedField | null;
  const q = searchParams.get('q') ?? '';

  if (!field || !(ALLOWED_FIELDS as readonly string[]).includes(field)) {
    return NextResponse.json({ error: 'Invalid field' }, { status: 400 });
  }

  const rows = await (prisma.product as any).findMany({
    where: q.trim()
      ? { [field]: { contains: q.trim(), mode: 'insensitive', not: null } }
      : { [field]: { not: null } },
    select: { [field]: true },
    distinct: [field],
    orderBy: { [field]: 'asc' },
    take: 20,
  });

  const dbValues: string[] = rows
    .map((r: Record<string, unknown>) => r[field])
    .filter((v: unknown): v is string => typeof v === 'string' && v.trim() !== '');

  const lower = q.trim().toLowerCase();

  if (field === 'colore') {
    const staticFiltered = (COLORE_OPTIONS as readonly string[])
      .filter((o) => !lower || o.toLowerCase().includes(lower));
    const merged = [...new Set([...dbValues, ...staticFiltered])];
    return NextResponse.json({ data: merged.slice(0, 15) });
  }

  if (field === 'fantasia') {
    const staticFiltered = (FANTASIA_OPTIONS as readonly string[])
      .filter((o) => !lower || o.toLowerCase().includes(lower));
    const merged = [...new Set([...dbValues, ...staticFiltered])].sort();
    return NextResponse.json({ data: merged.slice(0, 15) });
  }

  return NextResponse.json({ data: dbValues.slice(0, 8) });
}
