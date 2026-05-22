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

    function dedupNormStrings(values: (string | null)[]): string[] {
      const seen = new Set<string>();
      const result: string[] = [];
      for (const v of values) {
        if (!v) continue;
        const key = v.trim().toLowerCase();
        if (key && !seen.has(key)) {
          seen.add(key);
          result.push(key.charAt(0).toUpperCase() + key.slice(1));
        }
      }
      return result.sort((a, b) => a.localeCompare(b, 'it'));
    }

    return NextResponse.json({
      tranches: dedupNormStrings(tranches.map((t) => t.tranche)),
      paesi: dedupNormStrings(paesi.map((p) => p.paese)),
    });
  } catch (err) {
    console.error('[catalogo-pdf options]', err);
    return NextResponse.json({ error: 'Errore' }, { status: 500 });
  }
}
