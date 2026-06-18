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

  const responses = await prisma.surveyResponse.findMany({
    where: { surveyId: params.id, completed: true },
    include: {
      customer: { select: { companyName: true, email: true, customerCode: true } },
      answers: true,
    },
    orderBy: { submittedAt: 'asc' },
  });

  function getAnswer(answers: typeof responses[0]['answers'], key: string): string {
    const a = answers.find((x) => x.questionKey === key);
    if (!a) return '';
    if (a.answerJson !== null) return (a.answerJson as string[]).join('; ');
    if (a.answerNumber !== null) return String(a.answerNumber);
    return a.answerText ?? '';
  }

  function esc(v: string) {
    if (v.includes(',') || v.includes('"') || v.includes('\n')) {
      return `"${v.replace(/"/g, '""')}"`;
    }
    return v;
  }

  const headers = [
    'Data', 'Cliente', 'Email', 'Codice', 'Canale',
    'Soddisfazione (1-5)', 'Facilità uso (1-5)', 'Sezioni utili',
    'Prenotazioni future', 'Uso Demetra', 'Suggerimento',
  ];

  const rows = responses.map((r) =>
    [
      new Date(r.submittedAt).toLocaleDateString('it-IT'),
      r.customer.companyName,
      r.customer.email,
      r.customer.customerCode,
      r.sourceChannel ?? '',
      getAnswer(r.answers, 'soddisfazione'),
      getAnswer(r.answers, 'facilita_uso'),
      getAnswer(r.answers, 'sezioni_utili'),
      getAnswer(r.answers, 'prenotazioni_future'),
      getAnswer(r.answers, 'uso_demetra'),
      getAnswer(r.answers, 'suggerimento'),
    ].map(esc).join(',')
  );

  const csv = [headers.join(','), ...rows].join('\n');

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="survey-risposte-${params.id}.csv"`,
    },
  });
}
