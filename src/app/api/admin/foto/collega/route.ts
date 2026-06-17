import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { imageIndexToField } from '@/lib/parseImageFilename';

const ALLOWED = new Set(['ADMIN', 'SUPER_ADMIN']);

// PATCH /api/admin/foto/collega
// body: { productId: string, photoUrl: string | null, slot?: 1 | 2 | 3 | 4 }
// Links a photo URL to a product in the specified slot (default: 1).
// Pass photoUrl: null to unlink.

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !ALLOWED.has(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { productId, photoUrl, slot } = await req.json() as {
      productId: string;
      photoUrl: string | null;
      slot?: number;
    };
    if (!productId) return NextResponse.json({ error: 'productId richiesto' }, { status: 400 });

    const slotIndex = (slot && slot >= 1 && slot <= 4) ? slot : 1;
    const fieldName = imageIndexToField(slotIndex);

    const product = await prisma.product.update({
      where: { id: productId },
      data: { [fieldName]: photoUrl ?? null },
      select: { id: true, code: true, name: true, imageUrl: true },
    });

    return NextResponse.json({ data: product });
  } catch (err: any) {
    if (err.code === 'P2025') return NextResponse.json({ error: 'Prodotto non trovato' }, { status: 404 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
