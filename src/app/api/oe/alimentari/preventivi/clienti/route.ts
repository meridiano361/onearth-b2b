import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isMeridiano361Org } from '@/lib/modaServer';

async function requireM361() {
  const session = await getServerSession(authOptions);
  if (!session) return null;
  const ok = await isMeridiano361Org(session.user.role, session.user.organizationId);
  return ok ? session : null;
}

export async function GET(req: NextRequest) {
  if (!await requireM361()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const q = new URL(req.url).searchParams.get('q') ?? '';

  const clienti = await prisma.oePreventivoCliente.findMany({
    where: q ? {
      OR: [
        { nome: { contains: q, mode: 'insensitive' } },
        { cognome: { contains: q, mode: 'insensitive' } },
        { cliente: { contains: q, mode: 'insensitive' } },
        { telefono: { contains: q } },
        { email: { contains: q, mode: 'insensitive' } },
      ],
    } : {},
    orderBy: { cliente: 'asc' },
    take: 20,
  });

  return NextResponse.json(clienti);
}

export async function POST(req: NextRequest) {
  if (!await requireM361()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const nome: string = (body.nome ?? '').trim();
  const cognome: string = (body.cognome ?? '').trim();

  if (!nome) return NextResponse.json({ error: 'Nome obbligatorio' }, { status: 400 });

  const baseLabel = cognome ? `${cognome} ${nome}` : nome;
  const existing = await prisma.oePreventivoCliente.findMany({
    where: { cliente: { startsWith: baseLabel } },
    select: { cliente: true },
  });

  let clienteLabel = baseLabel;
  if (existing.length > 0) {
    clienteLabel = `${baseLabel} (${existing.length + 1})`;
  }

  const c = await prisma.oePreventivoCliente.create({
    data: {
      nome,
      cognome: cognome || null,
      cliente: clienteLabel,
      telefono: body.telefono ?? null,
      email: body.email ?? null,
      wa: body.wa ?? false,
    },
  });

  return NextResponse.json(c, { status: 201 });
}
