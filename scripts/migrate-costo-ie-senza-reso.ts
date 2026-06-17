/**
 * Copia costPrice → costoIeSenzaReso per tutti i prodotti dove costoIeSenzaReso è NULL.
 * Sicuro da rieseguire (idempotente): aggiorna solo prodotti non ancora migrati.
 *
 * Uso:
 *   npx ts-node --project tsconfig.json scripts/migrate-costo-ie-senza-reso.ts
 */
import { prisma } from '../src/lib/prisma';

async function main() {
  const result = await prisma.$executeRaw`
    UPDATE "Product"
    SET "costoIeSenzaReso" = "costPrice"
    WHERE "costoIeSenzaReso" IS NULL
      AND "costPrice" > 0
  `;

  console.log(`Migrati ${result} prodotti: costPrice → costoIeSenzaReso`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
