import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session) return null;
  const role = session.user.role;
  if (role !== 'SUPER_ADMIN' && role !== 'ADMIN') return null;
  return session;
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    await prisma.catalogTemplate.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Non trovato' }, { status: 404 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await req.json();
    const data: Record<string, unknown> = {};
    if (body.nome !== undefined) data.nome = String(body.nome).trim();
    if (body.configurazione !== undefined) data.configurazione = body.configurazione;

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'Nessun campo da aggiornare' }, { status: 400 });
    }

    const updated = await prisma.catalogTemplate.update({
      where: { id: params.id },
      data,
    });
    return NextResponse.json({ data: { ...updated, createdAt: updated.createdAt.toISOString() } });
  } catch {
    return NextResponse.json({ error: 'Non trovato o errore aggiornamento' }, { status: 404 });
  }
}
