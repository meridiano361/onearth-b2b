import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ data: [] });

  const { searchParams } = new URL(req.url);
  const idsParam = searchParams.get('productIds') || '';
  const productIds = idsParam.split(',').filter(Boolean);

  if (productIds.length === 0) return NextResponse.json({ data: [] });

  // Fetch cart products to extract their attributes + collection
  const cartProducts = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { nomLinea: true, temaColore: true, colore: true, classe: true, sottoclasse: true, collectionId: true },
  });

  const linee      = [...new Set(cartProducts.map((p) => p.nomLinea).filter(Boolean))] as string[];
  const temiColore = [...new Set(cartProducts.map((p) => p.temaColore).filter(Boolean))] as string[];
  const colori     = [...new Set(cartProducts.map((p) => p.colore).filter(Boolean))] as string[];
  const classi     = [...new Set(cartProducts.map((p) => p.classe).filter(Boolean))] as string[];
  const sottoclassi = [...new Set(cartProducts.map((p) => p.sottoclasse).filter(Boolean))] as string[];
  // Restrict suggestions to the same collection(s) as the cart products
  const collectionIds = [...new Set(cartProducts.map((p) => p.collectionId).filter(Boolean))] as string[];

  // Find candidates not already in cart, same collection
  const candidates = await prisma.product.findMany({
    where: {
      isActive: true,
      id: { notIn: productIds },
      ...(collectionIds.length > 0 ? { collectionId: { in: collectionIds } } : {}),
      OR: [
        linee.length      ? { nomLinea:   { in: linee } }      : undefined,
        temiColore.length ? { temaColore: { in: temiColore } } : undefined,
        colori.length     ? { colore:     { in: colori } }     : undefined,
        classi.length     ? { classe:     { in: classi } }     : undefined,
        sottoclassi.length ? { sottoclasse: { in: sottoclassi } } : undefined,
      ].filter(Boolean) as any[],
    },
    select: {
      id: true, code: true, name: true, imageUrl: true,
      costPrice: true, retailPrice: true, lotSize: true, iva: true,
      nomLinea: true, temaColore: true, colore: true, classe: true, sottoclasse: true,
    },
    take: 50,
  });

  // Score candidates by attribute overlap (higher priority = higher score)
  const scored = candidates.map((p) => {
    let score = 0;
    if (p.nomLinea   && linee.includes(p.nomLinea))           score += 5;
    if (p.temaColore && temiColore.includes(p.temaColore))    score += 4;
    if (p.colore     && colori.includes(p.colore))            score += 3;
    if (p.classe     && classi.includes(p.classe))            score += 2;
    if (p.sottoclasse && sottoclassi.includes(p.sottoclasse)) score += 1;
    return { ...p, costPrice: Number(p.costPrice), retailPrice: Number(p.retailPrice), score };
  });

  scored.sort((a, b) => b.score - a.score);
  const top3 = scored.slice(0, 3);

  return NextResponse.json({ data: top3 });
}
