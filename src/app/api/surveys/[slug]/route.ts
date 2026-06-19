import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  const { slug } = params;
  const token = req.nextUrl.searchParams.get('token');

  const survey = await prisma.survey.findUnique({
    where: { slug },
    include: { questions: { orderBy: { sortOrder: 'asc' } } },
  });
  if (!survey) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Resolve respondent email from token or session
  let respondentEmail: string | null = null;

  if (token) {
    const recipient = await prisma.surveyRecipient.findUnique({ where: { token } });
    if (recipient?.surveyId === survey.id) respondentEmail = recipient.email;
  }

  if (!respondentEmail) {
    const session = await getServerSession(authOptions);
    if (session?.user?.email) respondentEmail = session.user.email;
  }

  const now = new Date();
  const expired = now > survey.endsAt;
  const notStarted = now < survey.startsAt;

  let alreadyCompleted = false;
  if (respondentEmail) {
    const existing = await prisma.surveyResponse.findUnique({
      where: { surveyId_email: { surveyId: survey.id, email: respondentEmail } },
    });
    alreadyCompleted = !!existing?.completed;
  }

  return NextResponse.json({
    survey: {
      id: survey.id,
      slug: survey.slug,
      title: survey.title,
      description: survey.description,
      endsAt: survey.endsAt,
      status: survey.status,
      expired,
      notStarted,
    },
    questions: survey.questions.map((q) => ({
      id: q.id,
      questionKey: q.questionKey,
      questionText: q.questionText,
      questionType: q.questionType,
      optionsJson: q.optionsJson,
      required: q.required,
      sortOrder: q.sortOrder,
    })),
    customerId: respondentEmail,
    alreadyCompleted,
  });
}
