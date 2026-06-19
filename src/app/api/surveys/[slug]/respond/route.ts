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

  // Resolve respondent from token or session
  let respondentEmail: string | null = null;
  let respondentName: string | null = null;
  let customerId: string | null = null;
  let recipientId: string | null = null;

  if (body.token) {
    const recipient = await prisma.surveyRecipient.findUnique({ where: { token: body.token } });
    if (recipient?.surveyId === survey.id) {
      respondentEmail = recipient.email;
      respondentName = recipient.respondentName ?? null;
      customerId = recipient.customerId ?? null;
      recipientId = recipient.id;
    }
  }

  if (!respondentEmail) {
    const session = await getServerSession(authOptions);
    if (session?.user?.email) {
      respondentEmail = session.user.email;
      const customer = await prisma.customer.findUnique({ where: { email: respondentEmail } });
      if (customer) {
        customerId = customer.id;
        respondentName = customer.companyName;
        const r = await prisma.surveyRecipient.findUnique({
          where: { surveyId_email: { surveyId: survey.id, email: respondentEmail } },
        });
        recipientId = r?.id ?? null;
      }
    }
  }

  if (!respondentEmail) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });

  // Idempotency: reject if already completed
  const existing = await prisma.surveyResponse.findUnique({
    where: { surveyId_email: { surveyId: survey.id, email: respondentEmail } },
  });
  if (existing?.completed) return NextResponse.json({ error: 'Già risposto' }, { status: 409 });

  // Upsert response
  const response = await prisma.surveyResponse.upsert({
    where: { surveyId_email: { surveyId: survey.id, email: respondentEmail } },
    create: {
      surveyId: survey.id,
      customerId,
      email: respondentEmail,
      respondentName,
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

  if (recipientId) {
    await prisma.surveyRecipient.update({
      where: { id: recipientId },
      data: { completedAt: now, status: 'completed' },
    });
  }

  return NextResponse.json({ ok: true });
}
