import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { prisma } from '@/lib/prisma';

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
      ...gruppiMerceologici.map((v) => ({ ...v, tipo: 'gruppoMerceologico' })),
      ...famiglie.map((v) => ({ ...v, tipo: 'famiglia' })),
      ...classi.map((v) => ({ ...v, tipo: 'classe' })),
      ...sottoclassi.map((v) => ({ ...v, tipo: 'sottoclasse' })),
      ...gruppiOmogenei.map((v) => ({ ...v, tipo: 'gruppoOmogeneo' })),
      ...linee.map((v) => ({ ...v, tipo: 'nomLinea' })),
      ...stagioni.map((v) => ({ ...v, tipo: 'stagione' })),
      ...collezioni.map((v) => ({ ...v, tipo: 'collezione' })),
      ...colori.map((v) => ({ ...v, tipo: 'colore' })),
      ...temiColore.map((v) => ({ ...v, tipo: 'temaColore' })),
    ];

    return NextResponse.json({ data: valori });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
