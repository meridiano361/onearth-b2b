import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { prisma } from '@/lib/prisma';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const data: Record<string, unknown> = {};
  if (typeof b.featureMondiEspositivi === 'boolean') {
    data.featureMondiEspositivi = b.featureMondiEspositivi;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Nessun campo valido' }, { status: 400 });
  }

  try {
    const op = await prisma.operator.update({
      where: { id: params.id },
      data,
      select: { id: true, featureMondiEspositivi: true },
    });
    return NextResponse.json({ ok: true, operator: op });
  } catch {
    return NextResponse.json({ error: 'Operatore non trovato' }, { status: 404 });
  }
}
