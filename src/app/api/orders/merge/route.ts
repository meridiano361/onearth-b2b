import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { sourceOrderId, targetOrderId } = body ?? {};
  if (!sourceOrderId || !targetOrderId || sourceOrderId === targetOrderId) {
    return NextResponse.json({ error: 'Parametri non validi' }, { status: 400 });
  }

  const userId = session.user.id;
  const isOperator = session.user.role === 'OPERATOR';
  const orgId = (session.user as any).organizationId ?? null;

  // Carica entrambi gli ordini con i loro articoli
  const [source, target] = await Promise.all([
    prisma.order.findUnique({
      where: { id: sourceOrderId },
      include: { items: { include: { product: { select: { costPrice: true } } } } },
    }),
    prisma.order.findUnique({
      where: { id: targetOrderId },
      include: { items: true },
    }),
  ]);

  if (!source || !target) {
    return NextResponse.json({ error: 'Ordine non trovato' }, { status: 404 });
  }

  // Verifica ownership su entrambi
  function canAccess(order: { organizationId: string | null; customerId: string | null } | null) {
    if (!order) return false;
    if (isOperator) return order.organizationId === orgId;
    return order.customerId === userId;
  }
  if (!canAccess(source) || !canAccess(target)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Non si possono unire ordini già esportati
  if (source.status === 'ESPORTATO' || target.status === 'ESPORTATO') {
    return NextResponse.json({ error: 'Non puoi unire ordini già esportati' }, { status: 400 });
  }

  // Merge in transazione: upsert articoli sorgente in destinazione, poi elimina sorgente
  await prisma.$transaction(async (tx) => {
    for (const srcItem of source.items) {
      const unitPrice = Number(srcItem.product?.costPrice ?? srcItem.unitPrice);
      const existing = target.items.find(ti => ti.productId === srcItem.productId);

      if (existing) {
        const newQty = existing.quantity + srcItem.quantity;
        await tx.orderItem.update({
          where: { id: existing.id },
          data: { quantity: newQty, subtotal: unitPrice * newQty },
        });
      } else {
        await tx.orderItem.create({
          data: {
            orderId: targetOrderId,
            productId: srcItem.productId,
            quantity: srcItem.quantity,
            unitPrice,
            subtotal: unitPrice * srcItem.quantity,
            mercePronta: 0,
          },
        });
      }
    }

    // Ricalcola totali target
    const allItems = await tx.orderItem.findMany({
      where: { orderId: targetOrderId },
      select: { quantity: true, subtotal: true },
    });
    const totalValue = allItems.reduce((s, it) => s + Number(it.subtotal), 0);
    const totalItems = allItems.reduce((s, it) => s + it.quantity, 0);
    await tx.order.update({
      where: { id: targetOrderId },
      data: { totalValue, totalItems },
    });

    // Elimina articoli e ordine sorgente
    await tx.orderItem.deleteMany({ where: { orderId: sourceOrderId } });
    await tx.order.delete({ where: { id: sourceOrderId } });
  });

  return NextResponse.json({ ok: true, targetOrderId });
}
