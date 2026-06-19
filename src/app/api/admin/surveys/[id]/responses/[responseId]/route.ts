import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string; responseId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 });
  }

  const response = await prisma.surveyResponse.findUnique({
    where: { id: params.responseId },
  });
  if (!response || response.surveyId !== params.id) {
    return NextResponse.json({ error: 'Non trovata' }, { status: 404 });
  }

  // Reset recipient status so they can re-submit if needed
  await prisma.surveyRecipient.updateMany({
    where: { surveyId: params.id, customerId: response.customerId },
    data: { completedAt: null, status: 'sent' },
  });

  await prisma.surveyResponse.delete({ where: { id: params.responseId } });

  return NextResponse.json({ ok: true });
}
