import { NextResponse } from 'next/server';
import { requireMondiEspositivi } from '@/lib/featureGuard';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const operatorId = await requireMondiEspositivi();
  if (!operatorId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const now = new Date();

  const notifications = await prisma.notification.findMany({
    where: {
      attiva: true,
      dataInizio: { lte: now },
      OR: [{ dataScadenza: null }, { dataScadenza: { gt: now } }],
    },
    include: {
      reads: { where: { operatorId }, select: { id: true } },
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
