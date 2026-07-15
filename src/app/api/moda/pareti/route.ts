import { NextRequest, NextResponse } from 'next/server';
import { requireModaSession, canAccessVisual } from '@/lib/modaServer';
import { isAdminRole } from '@/lib/roles';
import { prisma } from '@/lib/prisma';

async function guard() {
  const session = await requireModaSession();
  if (!session) return null;
  const ok = await canAccessVisual(session.user?.role, session.user?.organizationId);
  return ok ? session : null;
}

// Admins see pareti with organizationId=null; operators see their own org's pareti.
function orgFilter(session: Awaited<ReturnType<typeof guard>>) {
  if (!session) return null;
  if (isAdminRole(session.user.role)) return null; // null = admin-owned
  return session.user.organizationId ?? null;
}

export async function GET() {
  const session = await guard();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const organizationId = orgFilter(session);

  const pareti = await prisma.pareteAttrezzata.findMany({
    where: { collezione: 'PE27', organizationId },
    orderBy: { ordine: 'asc' },
  });

  return NextResponse.json({ data: pareti });
}

export async function POST(req: NextRequest) {
  const session = await guard();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { nome } = body;
  if (!nome?.trim()) return NextResponse.json({ error: 'Nome obbligatorio' }, { status: 400 });

  const organizationId = orgFilter(session);

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
