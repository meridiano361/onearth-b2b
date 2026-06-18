import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PATCH(req: NextRequest, { params }: { params: { slug: string } }) {
  const { slug } = params;
  const { event, token } = await req.json() as { event: 'open' | 'start'; token?: string };

  const survey = await prisma.survey.findUnique({ where: { slug } });
  if (!survey) return NextResponse.json({ ok: false }, { status: 404 });

  let recipientId: string | null = null;

  if (token) {
    const r = await prisma.surveyRecipient.findUnique({ where: { token } });
    if (r?.surveyId === survey.id) recipientId = r.id;
  }

  if (!recipientId) {
    const session = await getServerSession(authOptions);
    if (session?.user?.email) {
      const customer = await prisma.customer.findUnique({ where: { email: session.user.email } });
      if (customer) {
        const r = await prisma.surveyRecipient.findUnique({
          where: { surveyId_customerId: { surveyId: survey.id, customerId: customer.id } },
        });
        recipientId = r?.id ?? null;
      }
    }
  }

  if (!recipientId) return NextResponse.json({ ok: true });

  if (event === 'open') {
    await prisma.surveyRecipient.updateMany({
      where: { id: recipientId, openedAt: null },
      data: { openedAt: new Date(), status: 'opened' },
    });
  } else if (event === 'start') {
    await prisma.surveyRecipient.updateMany({
      where: { id: recipientId, startedAt: null },
      data: { startedAt: new Date(), status: 'started' },
    });
  }

  return NextResponse.json({ ok: true });
}
