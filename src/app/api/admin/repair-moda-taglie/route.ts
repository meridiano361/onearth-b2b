import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { MODA_BRANCH_ID } from '@/lib/modaAccess';

// POST /api/admin/repair-moda-taglie?dryRun=true
// Repairs MODA orders where Arch2 products ended up with taglia='' due to the
// convert/route.ts bug (used p.taglia instead of item.taglia).
// Matches each broken OrderItem back to the converted Cart and restores the
// correct taglia from the original CartItem.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const dryRun = req.nextUrl.searchParams.get('dryRun') === 'true';

  // 1. Find all Arch2 product IDs (have sizeVariants, so taglia lives on CartItem/OrderItem).
  const arch2Products = await prisma.product.findMany({
    where: { sizeVariants: { not: Prisma.AnyNull }, collezione: 'PE27' },
    select: { id: true, sizeVariants: true },
  });
  const arch2Ids = new Set(arch2Products.map((p) => p.id));

  if (arch2Ids.size === 0) {
    return NextResponse.json({ message: 'Nessun prodotto Arch2 trovato', repaired: 0 });
  }

  // 2. Find MODA orders that have at least one Arch2 OrderItem with taglia=''.
  const brokenOrders = await prisma.order.findMany({
    where: {
      catalogBranch: MODA_BRANCH_ID,
      items: {
        some: {
          taglia: '',
          productId: { in: [...arch2Ids] },
        },
      },
    },
    select: {
      id: true,
      customerId: true,
      operatorId: true,
      createdAt: true,
      items: {
        where: {
          taglia: '',
          productId: { in: [...arch2Ids] },
        },
        select: { id: true, productId: true, taglia: true },
      },
    },
  });

  if (brokenOrders.length === 0) {
    return NextResponse.json({ message: 'Nessun ordine da riparare', repaired: 0 });
  }

  // 3. For each broken order, find the matching CONVERTED cart.
  //    Match by same user + closest updatedAt to order.createdAt.
  const report: { orderId: string; fixes: { orderItemId: string; productId: string; oldTaglia: string; newTaglia: string }[] }[] = [];
  const updates: { id: string; taglia: string }[] = [];

  for (const order of brokenOrders) {
    const userFilter = order.customerId
      ? { customerId: order.customerId }
      : order.operatorId
      ? { operatorId: order.operatorId }
      : null;

    if (!userFilter) continue;

    // Get all CONVERTED carts for this user, ordered by proximity to order creation time.
    const candidates = await prisma.cart.findMany({
      where: { ...userFilter, status: 'CONVERTED' },
      select: {
        id: true,
        updatedAt: true,
        items: {
          select: { productId: true, taglia: true, createdAt: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Pick the cart whose updatedAt is closest to the order's createdAt.
    const orderTs = order.createdAt.getTime();
    const matchedCart = candidates
      .filter((c) => c.items.some((i) => order.items.some((oi) => oi.productId === i.productId)))
      .sort((a, b) => Math.abs(a.updatedAt.getTime() - orderTs) - Math.abs(b.updatedAt.getTime() - orderTs))[0];

    if (!matchedCart) continue;

    // Build a map: productId → taglia from the cart (only Arch2 products).
    const cartTagliaByProduct = new Map<string, string>();
    for (const ci of matchedCart.items) {
      if (arch2Ids.has(ci.productId) && ci.taglia) {
        // If multiple taglie exist for same product in cart, this is an edge case
        // the buggy conversion would have failed on, so we take the first one found.
        if (!cartTagliaByProduct.has(ci.productId)) {
          cartTagliaByProduct.set(ci.productId, ci.taglia);
        }
      }
    }

    const orderFixes: (typeof report)[number]['fixes'] = [];
    for (const oi of order.items) {
      const newTaglia = cartTagliaByProduct.get(oi.productId);
      if (newTaglia && newTaglia !== oi.taglia) {
        orderFixes.push({ orderItemId: oi.id, productId: oi.productId, oldTaglia: oi.taglia, newTaglia });
        updates.push({ id: oi.id, taglia: newTaglia });
      }
    }

    if (orderFixes.length > 0) {
      report.push({ orderId: order.id, fixes: orderFixes });
    }
  }

  if (!dryRun && updates.length > 0) {
    // Execute all updates in a transaction. Each update changes taglia on the OrderItem.
    // The unique constraint (orderId, productId, taglia) is safe because we're restoring
    // the original taglia that was never stored (the broken value was '').
    await prisma.$transaction(
      updates.map((u) =>
        prisma.orderItem.update({
          where: { id: u.id },
          data: { taglia: u.taglia },
        })
      )
    );
  }

  return NextResponse.json({
    dryRun,
    repairedOrders: report.length,
    repairedItems: updates.length,
    report,
  });
}
