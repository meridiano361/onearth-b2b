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

export async function GET() {
  if (!await requireM361()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const cesti = await prisma.oeCesto.findMany({ orderBy: { codice: 'asc' } });
  return NextResponse.json(cesti);
}

export async function POST(req: NextRequest) {
  if (!await requireM361()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = await req.json();
  const { codice, descrizione, misure, pvp, costo, fotoUrl } = body;
  if (!codice || !descrizione) return NextResponse.json({ error: 'codice e descrizione obbligatori' }, { status: 400 });
  try {
    const cesto = await prisma.oeCesto.create({
      data: { codice, descrizione, misure: misure ?? '', pvp: Number(pvp) || 0, costo: Number(costo) || 0, fotoUrl: fotoUrl ?? '' },
    });
    return NextResponse.json(cesto);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('Unique constraint')) return NextResponse.json({ error: 'Codice già esistente' }, { status: 409 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
