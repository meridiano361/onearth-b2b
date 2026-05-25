import { NextRequest, NextResponse } from 'next/server';
import { requireMondiEspositivi } from '@/lib/featureGuard';
import { prisma } from '@/lib/prisma';

const FORBIDDEN = NextResponse.json({ error: 'Forbidden' }, { status: 403 });

export async function POST(
  _req: NextRequest,
  { params }: { params: { orderId: string; groupId: string } }
) {
  const operatorId = await requireMondiEspositivi();
  if (!operatorId) return FORBIDDEN;

  const source = await prisma.displayGroup.findUnique({
    where: { id: params.groupId, orderId: params.orderId },
    include: { prodotti: { orderBy: { posizione: 'asc' } } },
  });
  if (!source) return NextResponse.json({ error: 'Gruppo non trovato' }, { status: 404 });

  const lastGroup = await prisma.displayGroup.findFirst({
    where: { orderId: params.orderId },
    orderBy: { posizione: 'desc' },
    select: { posizione: true },
  });

  const newGroup = await prisma.displayGroup.create({
    data: {
      orderId: params.orderId,
      nome: `${source.nome} (copia)`,
      descrizione: source.descrizione,
      coloreTag: source.coloreTag,
      stagione: source.stagione,
      temaTag: source.temaTag,
      posizione: (lastGroup?.posizione ?? -1) + 1,
      prodotti: {
        create: source.prodotti.map((p) => ({
          orderItemId: p.orderItemId,
          nota: p.nota,
          posizione: p.posizione,
        })),
      },
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
                  imageUrl: true, retailPrice: true, costPrice: true,
                },
              },
            },
          },
        },
      },
    },
  });

  return NextResponse.json({ group: newGroup }, { status: 201 });
}
