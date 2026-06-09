import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const now = new Date();
  const userId = session.user.id;
  const role = session.user.role;

  if (role === 'CUSTOMER') {
    const notifications = await prisma.notification.findMany({
      where: {
        attiva: true,
        destinatari: 'tutti',
        dataInizio: { lte: now },
        OR: [{ dataScadenza: null }, { dataScadenza: { gt: now } }],
      },
      include: {
        customerReads: { where: { customerId: userId }, select: { id: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(
      notifications.map((n) => ({
        id: n.id,
        titolo: n.titolo,
        testo: n.testo,
        icona: n.icona,
        tipo: n.tipo,
        coloreSfondo: n.coloreSfondo,
        coloreTesto: n.coloreTesto,
        linkUrl: n.linkUrl,
        linkTesto: n.linkTesto,
        letta: n.customerReads.length > 0,
      }))
    );
  }

  // Operator path (existing behavior)
  if (role !== 'OPERATOR') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const op = await prisma.operator.findUnique({ where: { id: userId }, select: { attivo: true } });
  if (!op?.attivo) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const notifications = await prisma.notification.findMany({
    where: {
      attiva: true,
      dataInizio: { lte: now },
      OR: [{ dataScadenza: null }, { dataScadenza: { gt: now } }],
    },
    include: {
      reads: { where: { operatorId: userId }, select: { id: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(
    notifications.map((n) => ({
      id: n.id,
      titolo: n.titolo,
      testo: n.testo,
      icona: n.icona,
      tipo: n.tipo,
      coloreSfondo: n.coloreSfondo,
      coloreTesto: n.coloreTesto,
      destinatari: n.destinatari,
      linkUrl: n.linkUrl,
      linkTesto: n.linkTesto,
      letta: n.reads.length > 0,
    }))
  );
}
