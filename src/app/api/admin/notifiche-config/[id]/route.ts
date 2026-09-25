import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session) return null;
  if (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'ADMIN') return null;
  return session;
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.attiva !== undefined) data.attiva = Boolean(body.attiva);
  if (body.nome !== undefined) data.nome = body.nome;
  if (body.descrizione !== undefined) data.descrizione = body.descrizione || null;
  if (body.canale !== undefined) data.canale = body.canale;
  if (body.destinatari !== undefined) data.destinatari = body.destinatari;
  if (body.evento !== undefined) data.evento = body.evento;
  if (body.giorniAnticipo !== undefined) data.giorniAnticipo = body.giorniAnticipo ? Number(body.giorniAnticipo) : null;

  try {
    const rule = await prisma.notificheConfig.update({ where: { id: params.id }, data });
    return NextResponse.json(rule);
  } catch {
    return NextResponse.json({ error: 'Non trovata' }, { status: 404 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    await prisma.notificheConfig.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Non trovata' }, { status: 404 });
  }
}
