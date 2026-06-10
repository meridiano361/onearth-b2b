import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { sendCredenziali } from '@/lib/email';

function generateDefaultPassword(orgNome: string): string {
  const slug = orgNome.toLowerCase().normalize('NFD')
    .replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, '');
  return 'onearth_' + slug.substring(0, 5);
}

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const operator = await prisma.operator.findUnique({
      where: { id: params.id },
      select: {
        id: true, nome: true, email: true,
        organization: { select: { nome: true } },
      },
    });
    if (!operator) return NextResponse.json({ error: 'Non trovato' }, { status: 404 });

    const password = generateDefaultPassword(operator.organization.nome);
    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.operator.update({
      where: { id: params.id },
      data: { passwordHash },
    });

    const result = await sendCredenziali({
      nome: operator.nome,
      email: operator.email,
      password,
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
