import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const CANAL_TIPI = ['BOTTEGA', 'EMPORIO', 'DISTRETTO', 'STORE', 'OUTLET', 'TENDONE', 'FIERA', 'ONLINE', 'ALTRO'] as const;

const createSchema = z.object({
  nome: z.string().optional().nullable(),
  tipo: z.enum(CANAL_TIPI).default('BOTTEGA'),
  citta: z.string().optional().nullable(),
  indirizzo: z.string().optional().nullable(),
  budget: z.number().positive().optional().nullable(),
});

function buildNome(tipo: string, citta?: string | null) {
  return citta ? `${tipo} — ${citta}` : tipo;
}

function serialize(c: any) {
  return {
    ...c,
    budget: c.budget != null ? Number(c.budget) : null,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!session.user.organizationId) {
    return NextResponse.json({ data: [] });
  }

  const canali = await prisma.canale.findMany({
    where: { organizationId: session.user.organizationId },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json({ data: canali.map(serialize) });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user.organizationId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const data = createSchema.parse(body);

  const nome = data.nome?.trim() || buildNome(data.tipo, data.citta);

  const canale = await prisma.canale.create({
    data: {
      nome,
      tipo: data.tipo,
      citta: data.citta?.trim() || null,
      indirizzo: data.indirizzo?.trim() || null,
      budget: data.budget ?? null,
      organizationId: session.user.organizationId,
    },
  });

  return NextResponse.json({ data: serialize(canale) }, { status: 201 });
}
