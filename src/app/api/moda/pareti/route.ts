import { NextRequest, NextResponse } from 'next/server';
import { requireModaSession, canAccessVisual } from '@/lib/modaServer';
import { isAdminRole } from '@/lib/roles';
import { prisma } from '@/lib/prisma';

async function guard() {
  const session = await requireModaSession();
  if (!session) return null;
  const ok = await canAccessVisual(session.user?.role, session.user?.organizationId, session.user?.email);
  return ok ? session : null;
}

type OrgScope =
  | { type: 'admin' }                     // admin → organization_id IS NULL
  | { type: 'org'; organizationId: string } // operatore → filtra per la sua org
  | { type: 'empty' };                    // operatore senza org → lista vuota

function getScope(session: NonNullable<Awaited<ReturnType<typeof guard>>>): OrgScope {
  if (isAdminRole(session.user.role)) return { type: 'admin' };
  const organizationId = session.user.organizationId;
  if (!organizationId) return { type: 'empty' };
  return { type: 'org', organizationId };
}

export async function GET() {
  const session = await guard();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const scope = getScope(session);
  if (scope.type === 'empty') return NextResponse.json({ data: [] });

  const pareti = await prisma.pareteAttrezzata.findMany({
    where: {
      collezione: 'PE27',
      organizationId: scope.type === 'admin' ? null : scope.organizationId,
    },
    orderBy: { ordine: 'asc' },
  });

  return NextResponse.json({ data: pareti });
}

export async function POST(req: NextRequest) {
  const session = await guard();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const scope = getScope(session);
  if (scope.type === 'empty') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { nome } = body;
  if (!nome?.trim()) return NextResponse.json({ error: 'Nome obbligatorio' }, { status: 400 });

  const organizationId = scope.type === 'admin' ? null : scope.organizationId;

  const maxOrdine = await prisma.pareteAttrezzata.aggregate({
    _max: { ordine: true },
    where: { collezione: 'PE27', organizationId },
  });

  const parete = await prisma.pareteAttrezzata.create({
    data: {
      nome: nome.trim(),
      collezione: 'PE27',
      ordine: (maxOrdine._max.ordine ?? 0) + 1,
      configurazione: [],
      organizationId,
    },
  });

  return NextResponse.json({ data: parete }, { status: 201 });
}
