import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { prisma } from '@/lib/prisma';
import { translateProduct } from '@/lib/translate';

// POST /api/admin/products/translate
// Body: { productId: string } | { productIds: string[] } | { all: true }
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();

  // Determina la lista di prodotti da tradurre
  let productIds: string[] = [];

  if (body.all) {
    const products = await prisma.product.findMany({
      where: { descrizioneEn: null },
      select: { id: true },
    });
    productIds = products.map((p) => p.id);
  } else if (body.productIds && Array.isArray(body.productIds)) {
    productIds = body.productIds;
  } else if (body.productId) {
    productIds = [body.productId];
  } else {
    return NextResponse.json({ error: 'Nessun prodotto specificato' }, { status: 400 });
  }

  if (productIds.length === 0) {
    return NextResponse.json({ translated: 0, errors: [] });
  }

  let translated = 0;
  const errors: string[] = [];

  for (const id of productIds) {
    try {
      const product = await prisma.product.findUnique({
        where: { id },
        select: { id: true, description: true, name: true },
      });
      if (!product) { errors.push(`${id}: non trovato`); continue; }

      const testo = product.description || product.name;
      const trad = await translateProduct(testo);

      await prisma.product.update({
        where: { id },
        data: trad,
      });
      translated++;
    } catch (e: any) {
      errors.push(`${id}: ${e.message}`);
    }
    // Rate limit MyMemory: 200ms tra ogni chiamata
    await new Promise((r) => setTimeout(r, 200));
  }

  return NextResponse.json({ translated, errors });
}
