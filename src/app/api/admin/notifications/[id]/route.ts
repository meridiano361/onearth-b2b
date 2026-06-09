import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendNotificationToCustomers } from '@/lib/push';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session) return null;
  if (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'ADMIN') return null;
  return session;
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();

  const current = await prisma.notification.findUnique({ where: { id: params.id } });
  if (!current) return NextResponse.json({ error: 'Non trovata' }, { status: 404 });

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

  // Trigger customer delivery when activating for the first time
  const activating = body.attiva === true && !current.attiva;
  const targetsCxs = ['tutti'].includes(notification.destinatari);
  if (activating && targetsCxs && !current.sentToCustomersAt) {
    const claimed = await prisma.notification.updateMany({
      where: { id: params.id, sentToCustomersAt: null },
      data: { sentToCustomersAt: new Date() },
    });
    if (claimed.count > 0) {
      sendNotificationToCustomers(notification).catch((e) =>
        console.error('[notifications] Delivery error for', params.id, e)
      );
    }
  }

  return NextResponse.json(notification);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await prisma.notification.delete({ where: { id: params.id } });

  return NextResponse.json({ ok: true });
}
