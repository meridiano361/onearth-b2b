import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendSurveyCustomNotification } from '@/lib/surveySend';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const due = await prisma.surveyScheduledNotification.findMany({
    where: { status: 'pending', scheduledAt: { lte: new Date() } },
    orderBy: { scheduledAt: 'asc' },
  });

  if (due.length === 0) return NextResponse.json({ processed: 0 });

  const results: Array<{ id: string; status: string; sentCount?: number; error?: string }> = [];

  for (const notif of due) {
    await prisma.surveyScheduledNotification.update({
      where: { id: notif.id },
      data: { status: 'sending' },
    });

    try {
      const result = await sendSurveyCustomNotification(notif.surveyId, {
        title: notif.title,
        body: notif.body,
        channel: notif.channel as 'push' | 'email' | 'both',
        target: notif.target as 'pending' | 'all',
      });
      await prisma.surveyScheduledNotification.update({
        where: { id: notif.id },
        data: { status: 'sent', sentAt: new Date(), sentCount: result.pushSent + result.emailSent },
      });
      results.push({ id: notif.id, status: 'sent', sentCount: result.pushSent + result.emailSent });
    } catch (err: any) {
      console.error('[cron/survey-notifications]', notif.id, err?.message);
      await prisma.surveyScheduledNotification.update({
        where: { id: notif.id },
        data: { status: 'pending' },
      });
      results.push({ id: notif.id, status: 'error', error: err?.message });
    }
  }

  return NextResponse.json({ processed: due.length, results });
}
