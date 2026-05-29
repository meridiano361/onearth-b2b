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

  const notification = await prisma.notification.update({
    where: { id: params.id },
    data: {
      ...(body.titolo !== undefined && { titolo: body.titolo }),
      ...(body.testo !== undefined && { testo: body.testo }),
      ...(body.icona !== undefined && { icona: body.icona }),
      ...(body.tipo !== undefined && { tipo: body.tipo }),
      ...(body.coloreSfondo !== undefined && { coloreSfondo: body.coloreSfondo }),
      ...(body.coloreTesto !== undefined && { coloreTesto: body.coloreTesto }),
      ...(body.destinatari !== undefined && { destinatari: body.destinatari }),
      ...(body.dataInizio !== undefined && { dataInizio: body.dataInizio ? new Date(body.dataInizio) : new Date() }),
      ...(body.dataScadenza !== undefined && { dataScadenza: body.dataScadenza ? new Date(body.dataScadenza) : null }),
      ...(body.linkUrl !== undefined && { linkUrl: body.linkUrl || null }),
      ...(body.linkTesto !== undefined && { linkTesto: body.linkTesto || null }),
      ...(body.attiva !== undefined && { attiva: body.attiva }),
    },
  });

  return NextResponse.json(notification);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await prisma.notification.delete({ where: { id: params.id } });

  return NextResponse.json({ ok: true });
}
