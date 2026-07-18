import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Step 1: copy modello → nomLinea where nomLinea is null
  const productsToUpdate = await prisma.product.findMany({
    where: {
      modello: { not: null },
      nomLinea: null,
    },
    select: { id: true, modello: true },
  });

  console.log(`Products to migrate (modello→nomLinea): ${productsToUpdate.length}`);

  let migrated = 0;
  for (const p of productsToUpdate) {
    await prisma.product.update({
      where: { id: p.id },
      data: { nomLinea: p.modello!.toUpperCase() },
    });
    migrated++;
  }
  console.log(`Migrated: ${migrated}`);

  // Step 2: clear modello from ALL products
  const cleared = await prisma.product.updateMany({
    where: { modello: { not: null } },
    data: { modello: null },
  });
  console.log(`Cleared modello from: ${cleared.count} products`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
