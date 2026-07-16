import { NextRequest, NextResponse } from 'next/server';
import { requireVisualSession } from '@/lib/modaServer';
import { prisma } from '@/lib/prisma';
import type { LookProductTipo } from '@/lib/modaConfig';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireVisualSession();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { productId, note, tipo } = body as { productId?: string; note?: string; tipo?: LookProductTipo };
  if (!productId) return NextResponse.json({ error: 'productId obbligatorio' }, { status: 400 });

  const validTipos: LookProductTipo[] = ['look_item', 'completa_look', 'accessorio', 'gioiello'];
  const safeTipo: LookProductTipo = validTipos.includes(tipo as LookProductTipo) ? (tipo as LookProductTipo) : 'look_item';

  const max = await prisma.lookProdotto.aggregate({ _max: { ordine: true }, where: { lookId: params.id } });

  const entry = await prisma.lookProdotto.upsert({
    where: { lookId_productId: { lookId: params.id, productId } },
    create: { lookId: params.id, productId, note: note || null, tipo: safeTipo, ordine: (max._max.ordine ?? 0) + 1 },
    update: { note: note || null, tipo: safeTipo },
    include: {
      product: {
        select: {
          id: true, code: true, name: true, imageUrl: true,
          costPrice: true, retailPrice: true, lotSize: true, iva: true,
        },
      },
    },
  });

  return NextResponse.json({ data: entry }, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireVisualSession();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const productId = searchParams.get('productId');
  if (!productId) return NextResponse.json({ error: 'productId mancante' }, { status: 400 });

  await prisma.lookProdotto.deleteMany({ where: { lookId: params.id, productId } });
  return NextResponse.json({ ok: true });
}
