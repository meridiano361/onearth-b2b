import { NextRequest, NextResponse } from 'next/server';
import { requireVisualSession } from '@/lib/modaServer';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await requireVisualSession();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const looks = await prisma.look.findMany({
    where: { collezione: 'PE27' },
    include: {
      prodotti: {
        orderBy: { ordine: 'asc' },
        include: {
          product: {
            select: {
              id: true, code: true, name: true, imageUrl: true,
              costPrice: true, retailPrice: true, lotSize: true, iva: true,
              colore: true, famiglia: true,
            },
          },
        },
      },
    },
    orderBy: { ordine: 'asc' },
  });

  return NextResponse.json({ data: looks });
}

export async function POST(req: NextRequest) {
  const session = await requireVisualSession();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { titolo, descrizione, imageUrl } = body;
  if (!titolo?.trim()) {
    return NextResponse.json({ error: 'Titolo obbligatorio' }, { status: 400 });
  }

  const maxOrdine = await prisma.look.aggregate({ _max: { ordine: true }, where: { collezione: 'PE27' } });
  const look = await prisma.look.create({
    data: {
      titolo: titolo.trim(),
      descrizione: descrizione?.trim() || null,
      imageUrl: imageUrl?.trim() || null,
      collezione: 'PE27',
      ordine: (maxOrdine._max.ordine ?? 0) + 1,
    },
    include: { prodotti: true },
  });

  return NextResponse.json({ data: look }, { status: 201 });
}
