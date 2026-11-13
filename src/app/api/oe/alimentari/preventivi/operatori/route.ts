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

  const emporio = new URL(req.url).searchParams.get('emporio');

  const operatori = await prisma.oePreventivoOperatore.findMany({
    where: {
      attivo: true,
      ...(emporio ? {
        OR: [
          { emporio },
          { emporiAggiuntivi: { has: emporio } },
        ],
      } : {}),
    },
    orderBy: { nome: 'asc' },
  });

  return NextResponse.json(operatori);
}

export async function POST(req: NextRequest) {
  if (!await requireM361()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  if (!body.nome?.trim()) return NextResponse.json({ error: 'Nome obbligatorio' }, { status: 400 });

  const op = await prisma.oePreventivoOperatore.create({
    data: {
      nome: body.nome.trim(),
      emporio: body.emporio ?? 'CR',
      emporiAggiuntivi: body.emporiAggiuntivi ?? [],
      attivo: true,
    },
  });

  return NextResponse.json(op, { status: 201 });
}
