import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

type PrismaDelegate = {
  update: (args: any) => Promise<any>;
  delete: (args: any) => Promise<any>;
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

export async function PATCH(
  req: NextRequest,
  { params }: { params: { tipo: string; id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const delegate = TIPO_DELEGATE[params.tipo];
    if (!delegate) return NextResponse.json({ error: 'Tipo non valido' }, { status: 400 });

    const { nome } = z.object({ nome: z.string().min(1) }).parse(await req.json());

    const valore = await delegate.update({
      where: { id: params.id },
      data: { nome: nome.trim() },
    });

    return NextResponse.json({ data: { ...valore, tipo: params.tipo } });
  } catch (err: any) {
    if (err.code === 'P2025') return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (err.code === 'P2002') return NextResponse.json({ error: 'Valore già esistente' }, { status: 409 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { tipo: string; id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const delegate = TIPO_DELEGATE[params.tipo];
    if (!delegate) return NextResponse.json({ error: 'Tipo non valido' }, { status: 400 });

    await delegate.delete({ where: { id: params.id } });
    return NextResponse.json({ message: 'Eliminato' });
  } catch (err: any) {
    if (err.code === 'P2025') return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
