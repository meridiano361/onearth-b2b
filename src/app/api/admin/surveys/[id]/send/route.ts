import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { prisma } from '@/lib/prisma';
import { sendSurveyToAllCustomers } from '@/lib/surveySend';

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 });
  }

  const survey = await prisma.survey.findUnique({ where: { id: params.id } });
  if (!survey) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Upsert recipients for all active customers
  const customers = await prisma.customer.findMany({
    where: { isActive: true },
    select: { id: true, email: true, companyName: true },
  });
  for (const c of customers) {
    await prisma.surveyRecipient.upsert({
      where: { surveyId_email: { surveyId: survey.id, email: c.email } },
      create: { surveyId: survey.id, customerId: c.id, email: c.email, respondentName: c.companyName },
      update: {},
    });
  }

  // Upsert recipients for all active operators
  const operators = await prisma.operator.findMany({
    where: { attivo: true, email: { not: '' } },
    select: { email: true, nome: true, cognome: true },
  });
  for (const op of operators) {
    const name = `${op.nome} ${op.cognome}`.trim();
    await prisma.surveyRecipient.upsert({
      where: { surveyId_email: { surveyId: survey.id, email: op.email } },
      create: { surveyId: survey.id, email: op.email, respondentName: name },
      update: {},
    });
  }

  const result = await sendSurveyToAllCustomers(survey.id);
  return NextResponse.json({ ...result, totalOperators: operators.length });
}
