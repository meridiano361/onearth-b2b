import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { prisma } from '@/lib/prisma';

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, '').trim();
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 });
  }

  const surveyId = params.id;
  const search = req.nextUrl.searchParams.get('search') ?? '';

  const [questions, responses] = await Promise.all([
    prisma.surveyQuestion.findMany({ where: { surveyId }, orderBy: { sortOrder: 'asc' } }),
    prisma.surveyResponse.findMany({
      where: { surveyId, completed: true },
      include: {
        customer: { select: { id: true, companyName: true, email: true, customerCode: true } },
        answers: true,
      },
      orderBy: { submittedAt: 'desc' },
    }),
  ]);

  function getAnswer(answers: typeof responses[0]['answers'], key: string) {
    const a = answers.find((x) => x.questionKey === key);
    if (!a) return null;
    if (a.answerNumber !== null) return Number(a.answerNumber);
    if (a.answerJson !== null) return a.answerJson;
    return a.answerText ?? null;
  }

  let rows = responses.map((r) => {
    const answersMap: Record<string, unknown> = {};
    for (const q of questions) {
      answersMap[q.questionKey] = getAnswer(r.answers, q.questionKey);
    }
    return {
      id: r.id,
      submittedAt: r.submittedAt,
      sourceChannel: r.sourceChannel,
      respondentName: r.respondentName ?? r.customer?.companyName ?? r.email,
      email: r.email,
      customerCode: r.customer?.customerCode ?? null,
      organizationName: r.customer?.companyName ?? null,
      answers: answersMap,
    };
  });

  if (search) {
    const q = search.toLowerCase();
    rows = rows.filter((r) => {
      if (r.respondentName.toLowerCase().includes(q)) return true;
      if (r.email.toLowerCase().includes(q)) return true;
      return Object.values(r.answers).some(
        (v) => typeof v === 'string' && v.toLowerCase().includes(q)
      );
    });
  }

  return NextResponse.json({
    questions: questions.map((q) => ({ key: q.questionKey, text: stripHtml(q.questionText), type: q.questionType })),
    responses: rows,
  });
}
