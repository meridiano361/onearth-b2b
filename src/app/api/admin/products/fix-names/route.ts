import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { prisma } from '@/lib/prisma';

function normalizeSpaces(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { dryRun = false } = await req.json().catch(() => ({}));

    const products = await prisma.product.findMany({
      select: { id: true, name: true },
    });

    const toFix = products.filter(
      (p) => p.name && normalizeSpaces(p.name) !== p.name
    );

    if (dryRun) {
      return NextResponse.json({
        total: products.length,
        toFix: toFix.length,
        examples: toFix.slice(0, 10).map((p) => ({
          id: p.id,
          prima: p.name,
          dopo: normalizeSpaces(p.name!),
        })),
      });
    }

    let fixed = 0;
    for (const p of toFix) {
      await prisma.product.update({
        where: { id: p.id },
        data: { name: normalizeSpaces(p.name!) },
      });
      fixed++;
    }

    return NextResponse.json({ fixed, total: products.length });
  } catch (err) {
    console.error('[fix-names]', err);
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 });
  }
}
