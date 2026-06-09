import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = session.user.id;
  const role = session.user.role;

  if (role === 'CUSTOMER') {
    await prisma.customerNotificationRead.upsert({
      where: { notificationId_customerId: { notificationId: params.id, customerId: userId } },
      update: {},
      create: { notificationId: params.id, customerId: userId },
    });
    return NextResponse.json({ ok: true });
  }

  if (role !== 'OPERATOR') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await prisma.notificationRead.upsert({
    where: { notificationId_operatorId: { notificationId: params.id, operatorId: userId } },
    update: {},
    create: { notificationId: params.id, operatorId: userId },
  });

  return NextResponse.json({ ok: true });
}
