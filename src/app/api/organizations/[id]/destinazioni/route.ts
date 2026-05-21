import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createSchema = z.object({
  nome: z.string().min(1).optional().nullable(),
  tipo: z.enum(['BOTTEGA', 'EMPORIO', 'DISTRETTO', 'STORE', 'OUTLET', 'TENDONE', 'FIERA', 'ONLINE', 'ALTRO']).default('BOTTEGA'),
  citta: z.string().optional().nullable(),
  indirizzo: z.string().optional().nullable(),
  budget: z.number().min(0).optional().nullable(),
});

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const canali = await prisma.canale.findMany({
    where: { organizationId: params.id },
    orderBy: { nome: 'asc' },
  });

  return NextResponse.json({
    data: canali.map((c) => ({ ...c, createdAt: c.createdAt.toISOString(), updatedAt: c.updatedAt.toISOString() })),
  });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const data = createSchema.parse(body);

  const nome = data.nome?.trim() || (data.citta?.trim() ? `${data.tipo} — ${data.citta.trim()}` : data.tipo);

  const canale = await prisma.canale.create({
    data: {
      nome,
      tipo: data.tipo,
      citta: data.citta?.trim() || null,
      indirizzo: data.indirizzo?.trim() || null,
      budget: data.budget ?? null,
      organizationId: params.id,
    },
  });

  return NextResponse.json(
    { data: { ...canale, createdAt: canale.createdAt.toISOString(), updatedAt: canale.updatedAt.toISOString() } },
    { status: 201 }
  );
}
