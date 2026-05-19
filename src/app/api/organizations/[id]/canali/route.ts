import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createSchema = z.object({
  nome: z.string().min(1),
  tipo: z.enum(['BOTTEGA', 'TENDONE', 'ONLINE', 'ALTRO']).default('BOTTEGA'),
  citta: z.string().optional().nullable(),
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

  const canale = await prisma.canale.create({
    data: {
      nome: data.nome.trim(),
      tipo: data.tipo,
      citta: data.citta || null,
      organizationId: params.id,
    },
  });

  return NextResponse.json(
    { data: { ...canale, createdAt: canale.createdAt.toISOString(), updatedAt: canale.updatedAt.toISOString() } },
    { status: 201 }
  );
}
