import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const ALLOWED = new Set(['ADMIN', 'SUPER_ADMIN']);

// PATCH /api/admin/foto/collega
// body: { productId: string, photoUrl: string }
// Links a photo URL to a product; pass photoUrl: null to unlink

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !ALLOWED.has(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { productId, photoUrl } = await req.json() as { productId: string; photoUrl: string | null };
    if (!productId) return NextResponse.json({ error: 'productId richiesto' }, { status: 400 });

    const product = await prisma.product.update({
      where: { id: productId },
      data: { imageUrl: photoUrl ?? null },
      select: { id: true, code: true, name: true, imageUrl: true },
    });

    return NextResponse.json({ data: product });
  } catch (err: any) {
    if (err.code === 'P2025') return NextResponse.json({ error: 'Prodotto non trovato' }, { status: 404 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
