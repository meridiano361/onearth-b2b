import { NextRequest, NextResponse } from 'next/server';
import { requireVisualSession } from '@/lib/modaServer';
import { prisma } from '@/lib/prisma';
import type { OutfitZona } from '@/lib/modaEsposizioneConfig';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireVisualSession();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { productId, zona, note } = body as { productId?: string; zona?: OutfitZona; note?: string };
  if (!productId) return NextResponse.json({ error: 'productId obbligatorio' }, { status: 400 });

  const safeZona: OutfitZona = zona === 'destra' ? 'destra' : 'centro';

  const max = await prisma.outfitItem.aggregate({
    _max: { ordine: true },
    where: { outfitId: params.id, zona: safeZona },
  });

  const item = await prisma.outfitItem.upsert({
    where: { outfitId_productId: { outfitId: params.id, productId } },
    create: { outfitId: params.id, productId, zona: safeZona, note: note || null, ordine: (max._max.ordine ?? 0) + 1 },
    update: { zona: safeZona, note: note || null },
    include: {
      product: {
        select: {
          id: true, code: true, name: true, imageUrl: true,
          costPrice: true, retailPrice: true, lotSize: true, iva: true,
          colore: true, famiglia: true,
        },
      },
    },
  });

  return NextResponse.json({ data: item }, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireVisualSession();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const productId = searchParams.get('productId');
  if (!productId) return NextResponse.json({ error: 'productId mancante' }, { status: 400 });

  await prisma.outfitItem.deleteMany({ where: { outfitId: params.id, productId } });
  return NextResponse.json({ ok: true });
}
