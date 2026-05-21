// Normalizza il campo collezione in MAIUSCOLO nel DB (Product + lookup table)
// Uso: npx tsx scripts/normalize-collezione.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Products
  const products = await prisma.product.findMany({
    where: { collezione: { not: null } },
    select: { id: true, collezione: true },
  });

  let updatedProducts = 0;
  for (const p of products) {
    const upper = p.collezione!.toUpperCase();
    if (upper !== p.collezione) {
      await prisma.product.update({ where: { id: p.id }, data: { collezione: upper } });
      updatedProducts++;
    }
  }

  // Lookup table (cls_collezioni)
  const lookups = await prisma.collezione.findMany();
  let updatedLookups = 0;
  for (const l of lookups) {
    const upper = l.nome.toUpperCase();
    if (upper !== l.nome) {
      const existing = await prisma.collezione.findFirst({ where: { nome: upper } });
      if (existing) {
        // Already exists uppercase — just delete the old one
        await prisma.collezione.delete({ where: { id: l.id } });
      } else {
        await prisma.collezione.update({ where: { id: l.id }, data: { nome: upper } });
      }
      updatedLookups++;
    }
  }

  console.log(`Prodotti aggiornati: ${updatedProducts} / ${products.length}`);
  console.log(`Lookup aggiornati: ${updatedLookups} / ${lookups.length}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
