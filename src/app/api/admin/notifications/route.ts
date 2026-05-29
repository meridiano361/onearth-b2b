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

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const notifications = await prisma.notification.findMany({
    include: { _count: { select: { reads: true } } },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(notifications);
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();

  const notification = await prisma.notification.create({
    data: {
      titolo: body.titolo ?? '',
      testo: body.testo ?? '',
      icona: body.icona ?? '📢',
      tipo: body.tipo ?? 'Informazione',
      coloreSfondo: body.coloreSfondo ?? '#000000',
      coloreTesto: body.coloreTesto ?? '#FFFFFF',
      destinatari: body.destinatari ?? 'tutti',
      dataInizio: body.dataInizio ? new Date(body.dataInizio) : new Date(),
      dataScadenza: body.dataScadenza ? new Date(body.dataScadenza) : null,
      linkUrl: body.linkUrl || null,
      linkTesto: body.linkTesto || null,
      attiva: body.attiva === true,
    },
  });

  return NextResponse.json(notification, { status: 201 });
}
