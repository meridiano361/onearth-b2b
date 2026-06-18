import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

interface AnswerPayload {
  questionKey: string;
  answerText?: string;
  answerNumber?: number;
  answerJson?: unknown;
}

export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  const { slug } = params;
  const body = await req.json() as {
    token?: string;
    answers: AnswerPayload[];
    sourceChannel?: string;
  };

  const survey = await prisma.survey.findUnique({ where: { slug } });
  if (!survey) return NextResponse.json({ error: 'Survey not found' }, { status: 404 });

  const now = new Date();
  if (now > survey.endsAt) return NextResponse.json({ error: 'Survey scaduta' }, { status: 410 });
  if (survey.status !== 'active') return NextResponse.json({ error: 'Survey non attiva' }, { status: 410 });

  // Resolve customer
  let customerId: string | null = null;
  let recipientId: string | null = null;

  if (body.token) {
    const recipient = await prisma.surveyRecipient.findUnique({ where: { token: body.token } });
    if (recipient?.surveyId === survey.id) {
      customerId = recipient.customerId;
      recipientId = recipient.id;
    }
  }

  if (!customerId) {
    const session = await getServerSession(authOptions);
    if (session?.user?.email) {
      const customer = await prisma.customer.findUnique({ where: { email: session.user.email } });
      if (customer) {
        customerId = customer.id;
        const r = await prisma.surveyRecipient.findUnique({
          where: { surveyId_customerId: { surveyId: survey.id, customerId: customer.id } },
        });
        recipientId = r?.id ?? null;
      }
    }
  }

  if (!customerId) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });

  // Idempotency: if already completed, reject
  const existing = await prisma.surveyResponse.findUnique({
    where: { surveyId_customerId: { surveyId: survey.id, customerId } },
  });
  if (existing?.completed) return NextResponse.json({ error: 'Già risposto' }, { status: 409 });

  // Upsert response
  const response = await prisma.surveyResponse.upsert({
    where: { surveyId_customerId: { surveyId: survey.id, customerId } },
    create: {
      surveyId: survey.id,
      customerId,
      sourceChannel: body.sourceChannel ?? 'in_app',
      completed: true,
      submittedAt: now,
    },
    update: {
      completed: true,
      submittedAt: now,
      sourceChannel: body.sourceChannel ?? 'in_app',
    },
  });

  // Delete existing answers, then insert new ones
  await prisma.surveyAnswer.deleteMany({ where: { responseId: response.id } });
  for (const a of body.answers) {
    await prisma.surveyAnswer.create({
      data: {
        responseId: response.id,
        questionKey: a.questionKey,
        answerText: a.answerText ?? null,
        answerNumber: a.answerNumber != null ? a.answerNumber : null,
        answerJson: a.answerJson != null ? (a.answerJson as any) : undefined,
      },
    });
  }

  // Update recipient status
  if (recipientId) {
    await prisma.surveyRecipient.update({
      where: { id: recipientId },
      data: { completedAt: now, status: 'completed' },
    });
  }

  return NextResponse.json({ ok: true });
}
