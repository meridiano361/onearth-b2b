import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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

  if (!canAccess(source) || !canAccess(target)) {
    return NextResponse.json({ error: 'Non sei autorizzato su uno o entrambi gli ordini' }, { status: 403 });
  }

  if (source.status === 'ESPORTATO' || target.status === 'ESPORTATO') {
    return NextResponse.json({ error: 'Non puoi unire ordini già esportati' }, { status: 400 });
  }

  // Pre-compute all operations before the transaction so we can use the
  // non-interactive $transaction([...ops]) form, which is PgBouncer-compatible.
  // The interactive async-callback form is NOT compatible with PgBouncer.
  type MergedItem = {
    id?: string;          // present → update existing target item
    productId: string;
    taglia: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  };

  const merged: MergedItem[] = [];

  // Target items: keep as-is or add source quantity if there's a match
  for (const ti of target.items) {
    const srcMatch = source.items.find(
      si => si.productId === ti.productId && si.taglia === ti.taglia,
    );
    const unitPrice = Number(ti.unitPrice);
    const qty = ti.quantity + (srcMatch?.quantity ?? 0);
    merged.push({ id: ti.id, productId: ti.productId, taglia: ti.taglia, quantity: qty, unitPrice, subtotal: unitPrice * qty });
  }

  // Source items not already in target → create new
  for (const si of source.items) {
    const alreadyMerged = target.items.some(
      ti => ti.productId === si.productId && ti.taglia === si.taglia,
    );
    if (!alreadyMerged) {
      const unitPrice = Number(si.product?.costPrice ?? si.unitPrice);
      merged.push({ productId: si.productId, taglia: si.taglia, quantity: si.quantity, unitPrice, subtotal: unitPrice * si.quantity });
    }
  }

  const totalValue = merged.reduce((s, i) => s + i.subtotal, 0);
  const totalItems = merged.reduce((s, i) => s + i.quantity, 0);

  const ops = [
    // Update target items whose qty changed
    ...merged.filter(i => i.id).map(i =>
      prisma.orderItem.update({
        where: { id: i.id! },
        data: { quantity: i.quantity, subtotal: i.subtotal },
      }),
    ),
    // Create new items (source items not present in target)
    ...merged.filter(i => !i.id).map(i =>
      prisma.orderItem.create({
        data: {
          orderId: targetOrderId,
          productId: i.productId,
          taglia: i.taglia,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          subtotal: i.subtotal,
          mercePronta: 0,
        },
      }),
    ),
    // Update target order totals
    prisma.order.update({
      where: { id: targetOrderId },
      data: { totalValue, totalItems },
    }),
    // Remove source items (DisplayGroupItems cascade automatically)
    prisma.orderItem.deleteMany({ where: { orderId: sourceOrderId } }),
    // Remove source order (DisplayGroups cascade automatically)
    prisma.order.delete({ where: { id: sourceOrderId } }),
  ];

  try {
    await prisma.$transaction(ops as any);
  } catch (e: any) {
    console.error('[merge] failed source:%s target:%s error:%s', sourceOrderId, targetOrderId, e?.message ?? e);
    return NextResponse.json(
      { error: 'Errore durante l\'unione degli ordini. Riprova o contatta l\'assistenza.' },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, targetOrderId });
}
