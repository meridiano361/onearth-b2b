import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; notifId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 });
  }

  const notif = await prisma.surveyScheduledNotification.findFirst({
    where: { id: params.notifId, surveyId: params.id },
  });
  if (!notif) return NextResponse.json({ error: 'Non trovato' }, { status: 404 });
  if (notif.status !== 'pending') return NextResponse.json({ error: 'Non annullabile' }, { status: 409 });

  await prisma.surveyScheduledNotification.update({
    where: { id: params.notifId },
    data: { status: 'cancelled' },
  });

  return NextResponse.json({ ok: true });
}
