// Normalizza i nomi dei prodotti nel DB:
// - Rimuove ,;:.  sostituisce & con spazio
// - Tutto minuscolo, prima lettera maiuscola
// - Uppercasa il valore di nomLinea dove compare nel nome
// Uso: npx tsx scripts/normalize-product-names.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function normalizeProductName(name: string, nomLinea?: string | null): string {
  let result = name
    .replace(/[,;:.]/g, '')
    .replace(/&/g, ' ');

  result = result.replace(/\s+/g, ' ').trim();
  result = result.toLowerCase();
  if (result.length > 0) {
    result = result.charAt(0).toUpperCase() + result.slice(1);
  }

  if (nomLinea) {
    const linea = nomLinea.trim();
    if (linea) {
      const lineaLower = linea.toLowerCase();
      const idx = result.toLowerCase().indexOf(lineaLower);
      if (idx !== -1) {
        result =
          result.slice(0, idx) +
          result.slice(idx, idx + lineaLower.length).toUpperCase() +
          result.slice(idx + lineaLower.length);
      }
    }
  }

  return result;
}

async function main() {
  const products = await prisma.product.findMany({
    select: { id: true, name: true, nomLinea: true },
  });

  let updated = 0;
  let unchanged = 0;

  for (const p of products) {
    const normalized = normalizeProductName(p.name, p.nomLinea);
    if (normalized !== p.name) {
      await prisma.product.update({
        where: { id: p.id },
        data: { name: normalized },
      });
      updated++;
      console.log(`  "${p.name}" → "${normalized}"`);
    } else {
      unchanged++;
    }
  }

  console.log(`\nDone: ${updated} aggiornati, ${unchanged} invariati`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
