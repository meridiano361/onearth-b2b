import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { prisma } from '@/lib/prisma';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 });
  }

  const surveyId = params.id;
  const survey = await prisma.survey.findUnique({ where: { id: surveyId } });
  if (!survey) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const [recipients, responses, answers] = await Promise.all([
    prisma.surveyRecipient.findMany({ where: { surveyId } }),
    prisma.surveyResponse.findMany({ where: { surveyId, completed: true } }),
    prisma.surveyAnswer.findMany({
      where: { response: { surveyId } },
    }),
  ]);

  const totalRecipients = recipients.length;
  const totalPushSent = recipients.filter((r) => r.pushSentAt).length;
  const totalEmailSent = recipients.filter((r) => r.emailSentAt).length;
  const totalOpened = recipients.filter((r) => r.openedAt).length;
  const totalCompleted = responses.length;
  const responseRate = totalRecipients > 0 ? (totalCompleted / totalRecipients) * 100 : 0;

  // Star averages
  function avgStars(key: string) {
    const vals = answers
      .filter((a) => a.questionKey === key && a.answerNumber !== null)
      .map((a) => Number(a.answerNumber));
    return vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
  }

  // Distribution for star questions
  function starDist(key: string) {
    const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    answers
      .filter((a) => a.questionKey === key && a.answerNumber !== null)
      .forEach((a) => { const n = Math.round(Number(a.answerNumber)); if (n >= 1 && n <= 5) dist[n]++; });
    return dist;
  }

  // Single-select distribution
  function selectDist(key: string) {
    const dist: Record<string, number> = {};
    answers
      .filter((a) => a.questionKey === key && a.answerText)
      .forEach((a) => { dist[a.answerText!] = (dist[a.answerText!] ?? 0) + 1; });
    return dist;
  }

  // Multi-select counts
  function multiSelectCounts(key: string) {
    const counts: Record<string, number> = {};
    answers
      .filter((a) => a.questionKey === key && a.answerJson)
      .forEach((a) => {
        const opts = a.answerJson as string[];
        if (Array.isArray(opts)) {
          opts.forEach((o) => { counts[o] = (counts[o] ?? 0) + 1; });
        }
      });
    return counts;
  }

  return NextResponse.json({
    totalRecipients,
    totalPushSent,
    totalEmailSent,
    totalOpened,
    totalCompleted,
    responseRate: Math.round(responseRate * 10) / 10,
    avgSoddisfazione: avgStars('soddisfazione'),
    avgFacilitaUso: avgStars('facilita_uso'),
    distSoddisfazione: starDist('soddisfazione'),
    distFacilitaUso: starDist('facilita_uso'),
    distSezioniUtili: multiSelectCounts('sezioni_utili'),
    distPrenotazioniFuture: selectDist('prenotazioni_future'),
    distUsoDemetra: selectDist('uso_demetra'),
  });
}
