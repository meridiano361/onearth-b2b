import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { prisma } from '@/lib/prisma';

// Deduplicate case-insensitively, normalize to "First letter uppercase rest lowercase", sort.
function dedupNorm<T extends { nome: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const item of items) {
    const key = item.nome.trim().toLowerCase();
    if (key && !seen.has(key)) {
      seen.add(key);
      result.push({ ...item, nome: key.charAt(0).toUpperCase() + key.slice(1) });
    }
  }
  return result.sort((a, b) => a.nome.localeCompare(b.nome, 'it'));
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const [
      gruppiMerceologici,
      famiglie,
      classi,
      sottoclassi,
      gruppiOmogenei,
      linee,
      stagioni,
      collezioni,
      colori,
      temiColore,
    ] = await Promise.all([
      prisma.gruppoMerceologico.findMany({ orderBy: { nome: 'asc' } }),
      prisma.famiglia.findMany({ orderBy: { nome: 'asc' } }),
      prisma.classe.findMany({ orderBy: { nome: 'asc' } }),
      prisma.sottoclasse.findMany({ orderBy: { nome: 'asc' } }),
      prisma.gruppoOmogeneo.findMany({ orderBy: { nome: 'asc' } }),
      prisma.linea.findMany({ orderBy: { nome: 'asc' } }),
      prisma.stagione.findMany({ orderBy: { nome: 'asc' } }),
      prisma.collezione.findMany({ orderBy: { nome: 'asc' } }),
      prisma.colore.findMany({ orderBy: { nome: 'asc' } }),
      prisma.temaColore.findMany({ orderBy: { nome: 'asc' } }),
    ]);

    const valori = [
      ...dedupNorm(gruppiMerceologici).map((v) => ({ ...v, tipo: 'gruppoMerceologico' })),
      ...dedupNorm(famiglie).map((v) => ({ ...v, tipo: 'famiglia' })),
      ...dedupNorm(classi).map((v) => ({ ...v, tipo: 'classe' })),
      ...dedupNorm(sottoclassi).map((v) => ({ ...v, tipo: 'sottoclasse' })),
      ...dedupNorm(gruppiOmogenei).map((v) => ({ ...v, tipo: 'gruppoOmogeneo' })),
      ...dedupNorm(linee).map((v) => ({ ...v, tipo: 'nomLinea' })),
      ...dedupNorm(stagioni).map((v) => ({ ...v, tipo: 'stagione' })),
      ...dedupNorm(collezioni).map((v) => ({ ...v, tipo: 'collezione' })),
      ...dedupNorm(colori).map((v) => ({ ...v, tipo: 'colore' })),
      ...dedupNorm(temiColore).map((v) => ({ ...v, tipo: 'temaColore' })),
    ];

    return NextResponse.json({ data: valori });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
