import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendReminder } from '@/lib/email';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session) return null;
  if (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'ADMIN') return null;
  return session;
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  // body: { operatorIds: string[], messaggioPersonalizzato?: string }
  const { operatorIds, messaggioPersonalizzato } = body as {
    operatorIds: string[];
    messaggioPersonalizzato?: string;
  };

  if (!Array.isArray(operatorIds) || operatorIds.length === 0) {
    return NextResponse.json({ error: 'operatorIds richiesto' }, { status: 400 });
  }

  const operators = await prisma.operator.findMany({
    where: { id: { in: operatorIds }, attivo: true },
    include: { organization: { select: { nome: true } } },
  });

  const results = await Promise.all(
    operators.map(op =>
      sendReminder({
        nome: op.nome,
        email: op.email,
        orgNome: op.organization.nome,
        messaggioPersonalizzato,
      }).then(r => ({ email: op.email, ...r }))
    )
  );

  const sent = results.filter(r => r.sent).length;
  const errors = results.filter(r => !r.sent).map(r => r.email);

  return NextResponse.json({ sent, errors });
}
