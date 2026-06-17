import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { prisma } from '@/lib/prisma';

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
    take: 8,
  });

  const values: string[] = rows
    .map((r: Record<string, unknown>) => r[field])
    .filter((v: unknown): v is string => typeof v === 'string' && v.trim() !== '');

  return NextResponse.json({ data: values });
}
