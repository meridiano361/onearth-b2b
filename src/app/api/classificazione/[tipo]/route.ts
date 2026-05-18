import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

type PrismaDelegate = {
  findMany: (args?: any) => Promise<any[]>;
  create: (args: any) => Promise<any>;
};

const TIPO_DELEGATE: Record<string, PrismaDelegate> = {
  gruppoMerceologico: prisma.gruppoMerceologico,
  famiglia: prisma.famiglia,
  classe: prisma.classe,
  sottoclasse: prisma.sottoclasse,
  gruppoOmogeneo: prisma.gruppoOmogeneo,
  nomLinea: prisma.linea,
  stagione: prisma.stagione,
  collezione: prisma.collezione,
  colore: prisma.colore,
  temaColore: prisma.temaColore,
};

// FK field name that links each level to its parent
const PARENT_FIELD: Record<string, string> = {
  famiglia: 'gruppoMerceologicoId',
  classe: 'famigliaId',
  sottoclasse: 'classeId',
  gruppoOmogeneo: 'sottoclasseId',
};

export async function GET(
  req: NextRequest,
  { params }: { params: { tipo: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const delegate = TIPO_DELEGATE[params.tipo];
    if (!delegate) return NextResponse.json({ error: 'Tipo non valido' }, { status: 400 });

    const parentId = req.nextUrl.searchParams.get('parentId');
    const parentField = PARENT_FIELD[params.tipo];

    const where = parentId && parentField ? { [parentField]: parentId } : undefined;

    const valori = await delegate.findMany({ where, orderBy: { nome: 'asc' } });
    const withTipo = valori.map((v) => ({ ...v, tipo: params.tipo }));

    return NextResponse.json({ data: withTipo });
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

    const delegate = TIPO_DELEGATE[params.tipo];
    if (!delegate) return NextResponse.json({ error: 'Tipo non valido' }, { status: 400 });

    const body = await req.json();
    const { nome } = z.object({ nome: z.string().min(1) }).parse(body);

    const parentField = PARENT_FIELD[params.tipo];
    const parentId = parentField ? body[parentField] : undefined;

    if (parentField && !parentId) {
      return NextResponse.json({ error: `Campo ${parentField} obbligatorio` }, { status: 400 });
    }

    const data: Record<string, string> = { nome: nome.trim() };
    if (parentField && parentId) data[parentField] = parentId;

    const valore = await delegate.create({ data });

    return NextResponse.json({ data: { ...valore, tipo: params.tipo } }, { status: 201 });
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
