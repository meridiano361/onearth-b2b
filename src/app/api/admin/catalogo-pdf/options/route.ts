import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const role = session.user.role;
    if (role !== 'SUPER_ADMIN' && role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const [tranches, paesi] = await Promise.all([
      prisma.product.groupBy({
        by: ['tranche'],
        where: { tranche: { not: null } },
        orderBy: { tranche: 'asc' },
      }),
      prisma.product.groupBy({
        by: ['paese'],
        where: { paese: { not: null } },
        orderBy: { paese: 'asc' },
      }),
    ]);

    return NextResponse.json({
      tranches: tranches.map((t) => t.tranche).filter(Boolean),
      paesi: paesi.map((p) => p.paese).filter(Boolean),
    });
  } catch (err) {
    console.error('[catalogo-pdf options]', err);
    return NextResponse.json({ error: 'Errore' }, { status: 500 });
  }
}
