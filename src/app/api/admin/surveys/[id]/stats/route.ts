import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { prisma } from '@/lib/prisma';

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, '').trim();
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 });
  }

  const surveyId = params.id;

  const [survey, questions, recipients, responses, answers] = await Promise.all([
    prisma.survey.findUnique({ where: { id: surveyId } }),
    prisma.surveyQuestion.findMany({ where: { surveyId }, orderBy: { sortOrder: 'asc' } }),
    prisma.surveyRecipient.findMany({ where: { surveyId } }),
    prisma.surveyResponse.findMany({ where: { surveyId, completed: true } }),
    prisma.surveyAnswer.findMany({ where: { response: { surveyId } } }),
  ]);

  if (!survey) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const totalRecipients = recipients.length;
  const totalPushSent = recipients.filter((r) => r.pushSentAt).length;
  const totalEmailSent = recipients.filter((r) => r.emailSentAt).length;
  const totalOpened = recipients.filter((r) => r.openedAt).length;
  const totalCompleted = responses.length;
  const responseRate = totalRecipients > 0 ? (totalCompleted / totalRecipients) * 100 : 0;

  const questionStats = questions.map((q) => {
    const qAnswers = answers.filter((a) => a.questionKey === q.questionKey);

    if (q.questionType === 'stars') {
      const nums = qAnswers.filter((a) => a.answerNumber !== null).map((a) => Number(a.answerNumber));
      const dist: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
      nums.forEach((n) => { const k = Math.round(n); if (k >= 1 && k <= 5) dist[String(k)]++; });
      const avg = nums.length > 0 ? nums.reduce((s, v) => s + v, 0) / nums.length : null;
      return { key: q.questionKey, text: stripHtml(q.questionText), type: 'stars', dist, avg, total: nums.length };
    }

    if (q.questionType === 'single_select') {
      const dist: Record<string, number> = {};
      qAnswers.filter((a) => a.answerText).forEach((a) => { dist[a.answerText!] = (dist[a.answerText!] ?? 0) + 1; });
      return { key: q.questionKey, text: stripHtml(q.questionText), type: 'single_select', dist, total: qAnswers.length };
    }

    if (q.questionType === 'multi_select') {
      const dist: Record<string, number> = {};
      qAnswers.forEach((a) => {
        if (Array.isArray(a.answerJson)) {
          (a.answerJson as string[]).forEach((o) => { dist[o] = (dist[o] ?? 0) + 1; });
        }
      });
      return { key: q.questionKey, text: stripHtml(q.questionText), type: 'multi_select', dist, total: qAnswers.length };
    }

    // text
    const answered = qAnswers.filter((a) => a.answerText && a.answerText.trim()).length;
    return { key: q.questionKey, text: stripHtml(q.questionText), type: 'text', dist: {}, total: answered };
  });

  return NextResponse.json({
    totalRecipients,
    totalPushSent,
    totalEmailSent,
    totalOpened,
    totalCompleted,
    responseRate: Math.round(responseRate * 10) / 10,
    questions: questionStats,
  });
}
