/**
 * Compatta le foto dei prodotti eliminando i buchi:
 * se imageUrl è vuota ma imageUrl3 è piena, sposta tutto verso sinistra.
 *
 * Idempotente: aggiorna solo i prodotti che hanno effettivamente buchi.
 *
 * Uso:
 *   npx ts-node --project tsconfig.json scripts/compact-product-photos.ts
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    select: {
      id: true,
      imageUrl: true,
      imageUrl2: true,
      imageUrl3: true,
      imageUrl4: true,
      imageUrl5: true,
    },
  });

  let updated = 0;

  for (const p of products) {
    const slots = [p.imageUrl, p.imageUrl2, p.imageUrl3, p.imageUrl4, p.imageUrl5];
    const compacted = slots.filter(Boolean) as string[];

    // Pad back to 5 slots with null
    const next = [
      compacted[0] ?? null,
      compacted[1] ?? null,
      compacted[2] ?? null,
      compacted[3] ?? null,
      compacted[4] ?? null,
    ];

    // Skip if already compact (no change)
    if (
      next[0] === p.imageUrl &&
      next[1] === p.imageUrl2 &&
      next[2] === p.imageUrl3 &&
      next[3] === p.imageUrl4 &&
      next[4] === p.imageUrl5
    ) continue;

    await prisma.product.update({
      where: { id: p.id },
      data: {
        imageUrl:  next[0],
        imageUrl2: next[1],
        imageUrl3: next[2],
        imageUrl4: next[3],
        imageUrl5: next[4],
      },
    });

    updated++;
    console.log(`[${updated}] ${p.id} → [${next.map(v => v ? '✓' : '·').join(', ')}]`);
  }

  console.log(`\nFatto: ${updated} prodotti aggiornati su ${products.length} totali.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
