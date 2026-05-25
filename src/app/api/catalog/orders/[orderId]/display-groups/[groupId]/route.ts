import { NextRequest, NextResponse } from 'next/server';
import { requireMondiEspositivi } from '@/lib/featureGuard';
import { prisma } from '@/lib/prisma';

const FORBIDDEN = NextResponse.json({ error: 'Forbidden' }, { status: 403 });

export async function PUT(req: NextRequest, { params }: { params: { orderId: string; groupId: string } }) {
  const operatorId = await requireMondiEspositivi();
  if (!operatorId) return FORBIDDEN;

  const body = await req.json();
  const { nome, descrizione, coloreTag, stagione, temaTag } = body as Record<string, string | undefined | null>;

  const group = await prisma.displayGroup.update({
    where: { id: params.groupId, orderId: params.orderId },
    data: {
      ...(nome !== undefined && { nome: nome?.trim() || undefined }),
      ...(descrizione !== undefined && { descrizione: descrizione?.trim() || null }),
      ...(coloreTag !== undefined && { coloreTag: coloreTag || null }),
      ...(stagione !== undefined && { stagione: stagione?.trim() || null }),
      ...(temaTag !== undefined && { temaTag: temaTag?.trim() || null }),
    },
    include: {
      prodotti: {
        orderBy: { posizione: 'asc' },
        include: {
          orderItem: {
            include: {
              product: {
                select: {
                  id: true, code: true, name: true, description: true,
                  imageUrl: true, retailPrice: true, costPrice: true, lotSize: true,
                  nomLinea: true, colore: true, stagione: true, collezione: true,
                },
              },
            },
          },
        },
      },
    },
  });

  return NextResponse.json({ group });
}

export async function DELETE(_req: NextRequest, { params }: { params: { orderId: string; groupId: string } }) {
  const operatorId = await requireMondiEspositivi();
  if (!operatorId) return FORBIDDEN;

  await prisma.displayGroup.delete({
    where: { id: params.groupId, orderId: params.orderId },
  });

  return NextResponse.json({ ok: true });
}
