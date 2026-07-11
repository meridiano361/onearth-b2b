import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/accessori-vendita?tipo=collana
// Returns accessories matching the given tipo OR marked "universale"
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tipo = req.nextUrl.searchParams.get('tipo');

    const items = await prisma.accessorioVendita.findMany({
      where: {
        isActive: true,
        ...(tipo
          ? { tipoTarget: { hasSome: [tipo, 'universale'] } }
          : { tipoTarget: { has: 'universale' } }),
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({
      data: items.map((a) => ({
        ...a,
        retailPrice: Number(a.retailPrice),
        costPrice: Number(a.costPrice),
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString(),
      })),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
