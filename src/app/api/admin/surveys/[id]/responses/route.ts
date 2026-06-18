import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 });
  }

  const surveyId = params.id;
  const url = req.nextUrl;
  const search = url.searchParams.get('search') ?? '';
  const filterPrenotazioni = url.searchParams.get('prenotazioni') ?? '';
  const filterDemetra = url.searchParams.get('demetra') ?? '';
  const filterLowRating = url.searchParams.get('lowRating') === '1';

  const responses = await prisma.surveyResponse.findMany({
    where: { surveyId, completed: true },
    include: {
      customer: { select: { id: true, companyName: true, email: true, customerCode: true } },
      answers: true,
    },
    orderBy: { submittedAt: 'desc' },
  });

  function getAnswer(answers: typeof responses[0]['answers'], key: string) {
    const a = answers.find((x) => x.questionKey === key);
    if (!a) return null;
    if (a.answerNumber !== null) return Number(a.answerNumber);
    if (a.answerJson !== null) return a.answerJson;
    return a.answerText ?? null;
  }

  let rows = responses.map((r) => ({
    id: r.id,
    submittedAt: r.submittedAt,
    sourceChannel: r.sourceChannel,
    customer: r.customer,
    soddisfazione: getAnswer(r.answers, 'soddisfazione'),
    facilitaUso: getAnswer(r.answers, 'facilita_uso'),
    sezioniUtili: getAnswer(r.answers, 'sezioni_utili'),
    prenotazioniFuture: getAnswer(r.answers, 'prenotazioni_future'),
    usoDemetra: getAnswer(r.answers, 'uso_demetra'),
    suggerimento: getAnswer(r.answers, 'suggerimento'),
  }));

  // Filters
  if (filterPrenotazioni) {
    rows = rows.filter((r) => r.prenotazioniFuture === filterPrenotazioni);
  }
  if (filterDemetra) {
    rows = rows.filter((r) => r.usoDemetra === filterDemetra);
  }
  if (filterLowRating) {
    rows = rows.filter((r) => (r.soddisfazione as number) <= 2 || (r.facilitaUso as number) <= 2);
  }
  if (search) {
    const q = search.toLowerCase();
    rows = rows.filter(
      (r) =>
        r.customer.companyName.toLowerCase().includes(q) ||
        r.customer.email.toLowerCase().includes(q) ||
        (typeof r.suggerimento === 'string' && r.suggerimento.toLowerCase().includes(q))
    );
  }

  return NextResponse.json({ responses: rows });
}
