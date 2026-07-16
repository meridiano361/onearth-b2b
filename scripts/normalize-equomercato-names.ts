/**
 * One-time migration: normalize product names for all Equomercato products.
 * Rule: first letter uppercase + rest lowercase, except nomLinea which stays ALL CAPS.
 *
 * Run: npx tsx scripts/normalize-equomercato-names.ts
 */

import { PrismaClient } from '@prisma/client';
import { normalizeProductName } from '../src/lib/normalizeProductName';

const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    where: { conferente: 'Equomercato' },
    select: { id: true, name: true, nomLinea: true },
  });

  console.log(`Found ${products.length} Equomercato products`);

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const p of products) {
    const normalized = normalizeProductName(p.name, p.nomLinea);
    if (normalized === p.name) { skipped++; continue; }

    try {
      await prisma.product.update({ where: { id: p.id }, data: { name: normalized } });
      console.log(`  ✓ "${p.name}" → "${normalized}"`);
      updated++;
    } catch (e) {
      console.error(`  ✗ [${p.id}] ${e}`);
      errors++;
    }
  }

  console.log(`\nDone: ${updated} updated, ${skipped} already correct, ${errors} errors`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
