import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const TIPI_VALIDI = [
  'gruppoMerceologico', 'famiglia', 'classe', 'sottoclasse', 'gruppoOmogeneo',
  'nomLinea', 'stagione', 'collezione', 'colore', 'temaColore',
];

export async function GET(
  req: NextRequest,
  { params }: { params: { tipo: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!TIPI_VALIDI.includes(params.tipo)) {
      return NextResponse.json({ error: 'Tipo non valido' }, { status: 400 });
    }

    const valori = await prisma.classificazioneValore.findMany({
      where: { tipo: params.tipo },
      orderBy: { nome: 'asc' },
    });

    return NextResponse.json({ data: valori });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { tipo: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!TIPI_VALIDI.includes(params.tipo)) {
      return NextResponse.json({ error: 'Tipo non valido' }, { status: 400 });
    }

    const { nome } = z.object({ nome: z.string().min(1) }).parse(await req.json());

    const valore = await prisma.classificazioneValore.create({
      data: { tipo: params.tipo, nome: nome.trim() },
    });

    return NextResponse.json({ data: valore }, { status: 201 });
  } catch (err: any) {
    if (err.code === 'P2002') {
      return NextResponse.json({ error: 'Valore già esistente' }, { status: 409 });
    }
    if (err.name === 'ZodError') {
      return NextResponse.json({ error: 'Nome obbligatorio' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
