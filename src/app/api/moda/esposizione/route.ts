import { NextRequest, NextResponse } from 'next/server';
import { requireModaSession } from '@/lib/modaServer';
import { prisma } from '@/lib/prisma';

const PRODUCT_SELECT = {
  id: true, code: true, name: true,
  imageUrl: true, costPrice: true, retailPrice: true,
  lotSize: true, iva: true, colore: true, famiglia: true, sottofamiglia: true,
} as const;

export async function GET() {
  const session = await requireModaSession();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const outfits = await prisma.outfitEspositivo.findMany({
    where: { collezione: 'PE27' },
    include: {
      items: {
        orderBy: { ordine: 'asc' },
        include: { product: { select: PRODUCT_SELECT } },
      },
    },
    orderBy: { ordine: 'asc' },
  });

  return NextResponse.json({ data: outfits });
}

export async function POST(req: NextRequest) {
  const session = await requireModaSession();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { titolo, descrizione, coloriGuida, fantasia, imageUrl } = body;
  if (!titolo?.trim()) return NextResponse.json({ error: 'Titolo obbligatorio' }, { status: 400 });

  const max = await prisma.outfitEspositivo.aggregate({ _max: { ordine: true }, where: { collezione: 'PE27' } });

  const outfit = await prisma.outfitEspositivo.create({
    data: {
      titolo: titolo.trim(),
      descrizione: descrizione?.trim() || null,
      coloriGuida: coloriGuida ?? [],
      fantasia: fantasia?.trim() || null,
      imageUrl: imageUrl?.trim() || null,
      collezione: 'PE27',
      ordine: (max._max.ordine ?? 0) + 1,
    },
    include: { items: true },
  });

  return NextResponse.json({ data: outfit }, { status: 201 });
}
