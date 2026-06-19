import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { prisma } from '@/lib/prisma';
import { sendSurveyCustomNotification } from '@/lib/surveySend';

const IMMEDIATE_WINDOW_MS = 2 * 60 * 1000;

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 });
  }

  const notifications = await prisma.surveyScheduledNotification.findMany({
    where: { surveyId: params.id },
    orderBy: { scheduledAt: 'desc' },
  });

  return NextResponse.json({ notifications });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 });
  }

  const body = await req.json() as {
    title: string;
    body: string;
    scheduledAt: string;
    channel?: string;
    target?: string;
  };

  const { title, body: msgBody, scheduledAt: scheduledAtStr, channel = 'both', target = 'pending' } = body;
  if (!title?.trim() || !msgBody?.trim()) {
    return NextResponse.json({ error: 'title e body obbligatori' }, { status: 400 });
  }

  const scheduledAt = new Date(scheduledAtStr ?? Date.now());
  const isImmediate = scheduledAt.getTime() <= Date.now() + IMMEDIATE_WINDOW_MS;

  if (isImmediate) {
    const notif = await prisma.surveyScheduledNotification.create({
      data: { surveyId: params.id, title, body: msgBody, scheduledAt, channel, target, status: 'sending' },
    });

    try {
      const result = await sendSurveyCustomNotification(params.id, {
        title,
        body: msgBody,
        channel: channel as 'push' | 'email' | 'both',
        target: target as 'pending' | 'all',
      });
      const updated = await prisma.surveyScheduledNotification.update({
        where: { id: notif.id },
        data: { status: 'sent', sentAt: new Date(), sentCount: result.pushSent + result.emailSent },
      });
      return NextResponse.json({ notification: updated, result });
    } catch (err: any) {
      await prisma.surveyScheduledNotification.update({
        where: { id: notif.id },
        data: { status: 'pending' },
      });
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  const notif = await prisma.surveyScheduledNotification.create({
    data: { surveyId: params.id, title, body: msgBody, scheduledAt, channel, target, status: 'pending' },
  });

  return NextResponse.json({ notification: notif });
}
