/**
 * One-time repair: fixes MODA OrderItems where taglia='' due to convert/route.ts bug.
 * Run with: npx tsx scripts/repair-moda-taglie.ts [--dry-run]
 */
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();
const dryRun = process.argv.includes('--dry-run');

async function main() {
  console.log(`\n🔧 Repair MODA taglie — ${dryRun ? 'DRY RUN' : 'LIVE'}\n`);

  // 1. Arch2 products: have sizeVariants (taglia lives on item, not product).
  const arch2Products = await prisma.product.findMany({
    where: { sizeVariants: { not: Prisma.AnyNull }, collezione: 'PE27' },
    select: { id: true },
  });
  const arch2Ids = new Set(arch2Products.map((p) => p.id));
  console.log(`Arch2 products found: ${arch2Ids.size}`);

  // 2. MODA orders with at least one broken Arch2 item (taglia='').
  const brokenOrders = await prisma.order.findMany({
    where: {
      catalogBranch: 'modaPE27',
      items: { some: { taglia: '', productId: { in: [...arch2Ids] } } },
    },
    select: {
      id: true,
      customerId: true,
      operatorId: true,
      createdAt: true,
      items: {
        where: { taglia: '', productId: { in: [...arch2Ids] } },
        select: { id: true, productId: true, quantity: true },
      },
    },
  });
  console.log(`Broken MODA orders: ${brokenOrders.length}\n`);

  const updates: { id: string; taglia: string }[] = [];

  for (const order of brokenOrders) {
    const userFilter = order.customerId
      ? { customerId: order.customerId }
      : order.operatorId
      ? { operatorId: order.operatorId }
      : null;

    if (!userFilter) {
      console.log(`  Order ${order.id}: no user attached, skip`);
      continue;
    }

    // Find CONVERTED carts for this user.
    const carts = await prisma.cart.findMany({
      where: { ...userFilter, status: 'CONVERTED' },
      select: {
        id: true,
        updatedAt: true,
        items: { select: { productId: true, taglia: true } },
      },
    });

    // Pick cart whose updatedAt is closest to order.createdAt AND shares products.
    const orderTs = order.createdAt.getTime();
    const orderProductIds = new Set(order.items.map((i) => i.productId));

    const matching = carts
      .filter((c) => c.items.some((i) => orderProductIds.has(i.productId)))
      .sort((a, b) => Math.abs(a.updatedAt.getTime() - orderTs) - Math.abs(b.updatedAt.getTime() - orderTs));

    const cart = matching[0];
    if (!cart) {
      console.log(`  Order ${order.id}: no matching cart found`);
      continue;
    }

    // Build productId → taglia map from cart.
    const tagliaMap = new Map<string, string>();
    for (const ci of cart.items) {
      if (arch2Ids.has(ci.productId) && ci.taglia && !tagliaMap.has(ci.productId)) {
        tagliaMap.set(ci.productId, ci.taglia);
      }
    }

    console.log(`  Order ${order.id} (cart ${cart.id}, Δ${Math.round((cart.updatedAt.getTime() - orderTs) / 1000)}s):`);
    for (const oi of order.items) {
      const newTaglia = tagliaMap.get(oi.productId);
      if (newTaglia) {
        console.log(`    OrderItem ${oi.id}: taglia '' → '${newTaglia}' (product ${oi.productId}, qty ${oi.quantity})`);
        updates.push({ id: oi.id, taglia: newTaglia });
      } else {
        console.log(`    OrderItem ${oi.id}: no cart taglia found for product ${oi.productId}`);
      }
    }
  }

  console.log(`\nTotal items to update: ${updates.length}`);

  if (!dryRun && updates.length > 0) {
    await prisma.$transaction(
      updates.map((u) =>
        prisma.orderItem.update({ where: { id: u.id }, data: { taglia: u.taglia } })
      )
    );
    console.log('✅ Done.\n');
  } else if (dryRun) {
    console.log('(dry run — no changes made)\n');
  } else {
    console.log('Nothing to update.\n');
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
