import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Returns canali for the authenticated operator's organization (used by /seleziona-canale)
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const orgId = searchParams.get('organizationId') || session.user.organizationId;

  if (!orgId) return NextResponse.json({ error: 'organizationId required' }, { status: 400 });

  // Operators can only fetch their own org's canali
  if (session.user.role === 'OPERATOR' && orgId !== session.user.organizationId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const canali = await prisma.canale.findMany({
    where: { organizationId: orgId },
    orderBy: { nome: 'asc' },
    select: { id: true, nome: true, tipo: true, citta: true, organizationId: true, createdAt: true },
  });

  return NextResponse.json({
    data: canali.map((c) => ({ ...c, createdAt: c.createdAt.toISOString() })),
  });
}
