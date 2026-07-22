import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Parse body safely — never let req.json() crash the handler
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Payload non valido' }, { status: 400 });
  }

  const { sourceOrderId, targetOrderId } = body ?? {};
  if (!sourceOrderId || !targetOrderId || sourceOrderId === targetOrderId) {
    return NextResponse.json({ error: 'Parametri non validi' }, { status: 400 });
  }

  const userId = session.user.id;
  const isOperator = session.user.role === 'OPERATOR';
  const orgId = (session.user as any).organizationId ?? null;

  // Load both orders with their items
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

  function canAccess(order: { organizationId: string | null; customerId: string | null } | null) {
    if (!order) return false;
    if (isOperator) return order.organizationId === orgId;
    return order.customerId === userId;
  }

  const sourceOk = canAccess(source);
  const targetOk = canAccess(target);

  if (!sourceOk || !targetOk) {
    console.warn(
      '[merge] Forbidden — role:%s userId:%s | source(id:%s customerId:%s orgId:%s) access:%s | target(id:%s customerId:%s orgId:%s) access:%s',
      session.user.role, userId,
      source.id, source.customerId, source.organizationId, sourceOk,
      target.id, target.customerId, target.organizationId, targetOk,
    );
    return NextResponse.json({ error: 'Non sei autorizzato su uno o entrambi gli ordini' }, { status: 403 });
  }

  if (source.status === 'ESPORTATO' || target.status === 'ESPORTATO') {
    return NextResponse.json({ error: 'Non puoi unire ordini già esportati' }, { status: 400 });
  }

  // Run merge inside a transaction — wrapped in try/catch so errors always
  // return JSON instead of an empty 500 body that breaks response.json()
  try {
    await prisma.$transaction(
      async (tx) => {
        for (const srcItem of source.items) {
          const unitPrice = Number(srcItem.product?.costPrice ?? srcItem.unitPrice);
          const existing = target.items.find(
            ti => ti.productId === srcItem.productId && ti.taglia === srcItem.taglia,
          );

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
                taglia: srcItem.taglia,
                quantity: srcItem.quantity,
                unitPrice,
                subtotal: unitPrice * srcItem.quantity,
                mercePronta: 0,
              },
            });
          }
        }

        // Recalculate target totals
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

        // Delete source items then source order (cascade handles DisplayGroups)
        await tx.orderItem.deleteMany({ where: { orderId: sourceOrderId } });
        await tx.order.delete({ where: { id: sourceOrderId } });
      },
      { timeout: 15_000 }, // generous timeout for orders with many items
    );
  } catch (e: any) {
    const detail = e?.message ?? String(e);
    console.error(
      '[merge] Transaction failed — role:%s userId:%s source:%s target:%s error:%s',
      session.user.role, userId, sourceOrderId, targetOrderId, detail,
    );
    return NextResponse.json(
      { error: `Errore unione: ${detail}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, targetOrderId });
}
