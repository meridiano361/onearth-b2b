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

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search')?.toLowerCase() ?? '';
  const filter = searchParams.get('filter') ?? 'all'; // all | email | push | pending | completed

  let recipients = await prisma.surveyRecipient.findMany({
    where: { surveyId: params.id },
    orderBy: { createdAt: 'asc' },
  });

  if (search) {
    recipients = recipients.filter(
      (r) =>
        r.email.toLowerCase().includes(search) ||
        (r.respondentName ?? '').toLowerCase().includes(search)
    );
  }

  if (filter === 'email') recipients = recipients.filter((r) => !!r.emailSentAt);
  if (filter === 'push') recipients = recipients.filter((r) => !!r.pushSentAt);
  if (filter === 'pending') recipients = recipients.filter((r) => !r.emailSentAt && !r.pushSentAt);
  if (filter === 'completed') recipients = recipients.filter((r) => r.status === 'completed');

  return NextResponse.json({ recipients });
}
