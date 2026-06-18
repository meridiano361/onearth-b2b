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

  // Ensure recipients exist for all active customers (idempotent)
  const customers = await prisma.customer.findMany({
    where: { isActive: true },
    select: { id: true, email: true },
  });
  for (const c of customers) {
    await prisma.surveyRecipient.upsert({
      where: { surveyId_customerId: { surveyId: survey.id, customerId: c.id } },
      create: { surveyId: survey.id, customerId: c.id, email: c.email },
      update: {},
    });
  }

  const result = await sendSurveyToAllCustomers(survey.id);
  return NextResponse.json(result);
}
