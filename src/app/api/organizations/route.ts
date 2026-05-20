import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createSchema = z.object({
  nome: z.string().min(1),
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const orgs = await prisma.organization.findMany({
    orderBy: { nome: 'asc' },
    include: {
      _count: { select: { operatori: true, canali: true, ordini: true } },
      operatori: {
        orderBy: { cognome: 'asc' },
        select: {
          id: true,
          nome: true,
          cognome: true,
          email: true,
          telefono: true,
          ruolo: true,
          attivo: true,
          createdAt: true,
          organizationId: true,
        },
      },
      canali: {
        orderBy: { nome: 'asc' },
        select: {
          id: true,
          nome: true,
          tipo: true,
          citta: true,
          organizationId: true,
          createdAt: true,
          _count: { select: { ordini: true } },
        },
      },
    },
  });

  return NextResponse.json({
    data: orgs.map((o) => ({
      ...o,
      createdAt: o.createdAt.toISOString(),
      operatori: o.operatori.map((op) => ({ ...op, createdAt: op.createdAt.toISOString() })),
      destinazioni: o.canali.map((c) => ({ ...c, createdAt: c.createdAt.toISOString() })),
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const data = createSchema.parse(body);

  const org = await prisma.organization.create({
    data: { nome: data.nome.trim() },
  });

  return NextResponse.json(
    { data: { ...org, createdAt: org.createdAt.toISOString() } },
    { status: 201 }
  );
}
