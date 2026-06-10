import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { prisma } from '@/lib/prisma';
import { sendCredenziali } from '@/lib/email';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { password } = await req.json();
    if (!password || typeof password !== 'string' || password.trim().length < 1) {
      return NextResponse.json({ error: 'Password mancante' }, { status: 400 });
    }

    const operator = await prisma.operator.findUnique({
      where: { id: params.id },
      select: {
        id: true, nome: true, email: true,
        organization: { select: { nome: true } },
      },
    });
    if (!operator) return NextResponse.json({ error: 'Non trovato' }, { status: 404 });

    // Invia la password fornita dall'admin — nessuna modifica al DB
    const result = await sendCredenziali({
      nome: operator.nome,
      email: operator.email,
      password: password.trim(),
      orgNome: operator.organization.nome,
    });

    return NextResponse.json({
      email: operator.email,
      sent: result.sent,
      error: result.error,
    });
  } catch {
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 });
  }
}
