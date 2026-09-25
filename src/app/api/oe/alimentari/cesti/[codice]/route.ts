import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isMeridiano361Org } from '@/lib/modaServer';
import { prisma } from '@/lib/prisma';

async function requireM361() {
  const session = await getServerSession(authOptions);
  if (!session) return null;
  const ok = await isMeridiano361Org(session.user.role, session.user.organizationId);
  return ok ? session : null;
}

export async function PATCH(req: NextRequest, { params }: { params: { codice: string } }) {
  if (!await requireM361()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = await req.json();
  const { descrizione, misure, pvp, costo, fotoUrl } = body;
  try {
    const cesto = await prisma.oeCesto.update({
      where: { codice: params.codice },
      data: {
        ...(descrizione !== undefined && { descrizione }),
        ...(misure !== undefined && { misure }),
        ...(pvp !== undefined && { pvp: Number(pvp) }),
        ...(costo !== undefined && { costo: Number(costo) }),
        ...(fotoUrl !== undefined && { fotoUrl }),
      },
    });
    return NextResponse.json(cesto);
  } catch {
    return NextResponse.json({ error: 'Cesto non trovato' }, { status: 404 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { codice: string } }) {
  if (!await requireM361()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  try {
    await prisma.oeCesto.delete({ where: { codice: params.codice } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Cesto non trovato' }, { status: 404 });
  }
}
