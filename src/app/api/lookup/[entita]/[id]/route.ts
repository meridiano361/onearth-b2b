import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

type PrismaDelegate = {
  update: (args: any) => Promise<any>;
  delete: (args: any) => Promise<any>;
};

const DELEGATE: Record<string, PrismaDelegate> = {
  produttore: prisma.produttore,
  misura: prisma.misura,
  fasciaRicarico: prisma.fasciaRicarico,
  linea: prisma.linea,
  stagione: prisma.stagione,
  collezione: prisma.collezione,
  colore: prisma.colore,
  temaColore: prisma.temaColore,
};

export async function PATCH(
  req: NextRequest,
  { params }: { params: { entita: string; id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const delegate = DELEGATE[params.entita];
    if (!delegate) return NextResponse.json({ error: 'Entità non valida' }, { status: 400 });

    const { nome } = z.object({ nome: z.string().min(1) }).parse(await req.json());
    const record = await delegate.update({ where: { id: params.id }, data: { nome: nome.trim() } });
    return NextResponse.json({ data: record });
  } catch (err: any) {
    if (err.code === 'P2025') return NextResponse.json({ error: 'Non trovato' }, { status: 404 });
    if (err.code === 'P2002') return NextResponse.json({ error: 'Valore già esistente' }, { status: 409 });
    if (err.name === 'ZodError') return NextResponse.json({ error: 'Nome obbligatorio' }, { status: 400 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { entita: string; id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const delegate = DELEGATE[params.entita];
    if (!delegate) return NextResponse.json({ error: 'Entità non valida' }, { status: 400 });

    await delegate.delete({ where: { id: params.id } });
    return NextResponse.json({ message: 'Eliminato' });
  } catch (err: any) {
    if (err.code === 'P2025') return NextResponse.json({ error: 'Non trovato' }, { status: 404 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
