import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { cookies } from 'next/headers';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { PREVIEW_COOKIE } from '@/lib/preview';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const startSchema = z.object({
  organizationId: z.string().min(1),
  operatorId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { organizationId, operatorId } = startSchema.parse(body);

  // Verify the operator belongs to the org
  const operator = await prisma.operator.findFirst({
    where: { id: operatorId, organizationId },
    include: { organization: true },
  });

  if (!operator) {
    return NextResponse.json({ error: 'Operatore non trovato' }, { status: 404 });
  }

  const cookieValue = JSON.stringify({
    previewMode: true,
    organizationId,
    operatorId,
    orgName: operator.organization.nome,
    operatorName: `${operator.nome} ${operator.cognome}`,
    adminEmail: session.user.email,
  });

  cookies().set(PREVIEW_COOKIE, cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8, // 8 hours
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  cookies().delete(PREVIEW_COOKIE);
  return NextResponse.json({ ok: true });
}
