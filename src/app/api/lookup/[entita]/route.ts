import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { normalizeLookupValue } from '@/lib/normalizeClassification';

type PrismaDelegate = {
  findMany: (args?: any) => Promise<any[]>;
  create: (args: any) => Promise<any>;
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
  tranche: prisma.tranche,
};

export async function GET(
  _req: NextRequest,
  { params }: { params: { entita: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const delegate = DELEGATE[params.entita];
    if (!delegate) return NextResponse.json({ error: 'Entità non valida' }, { status: 400 });

    const data = await delegate.findMany({ orderBy: { nome: 'asc' } });
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { entita: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const delegate = DELEGATE[params.entita];
    if (!delegate) return NextResponse.json({ error: 'Entità non valida' }, { status: 400 });

    const { nome } = z.object({ nome: z.string().min(1) }).parse(await req.json());
    const record = await delegate.create({ data: { nome: normalizeLookupValue(params.entita, nome) } });
    return NextResponse.json({ data: record }, { status: 201 });
  } catch (err: any) {
    if (err.code === 'P2002') return NextResponse.json({ error: 'Valore già esistente' }, { status: 409 });
    if (err.name === 'ZodError') return NextResponse.json({ error: 'Nome obbligatorio' }, { status: 400 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
