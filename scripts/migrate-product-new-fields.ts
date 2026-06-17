/**
 * Aggiunge le nuove colonne al prodotto.
 * Esecuzione: npx ts-node --project tsconfig.json scripts/migrate-product-new-fields.ts
 * Poi: npx prisma generate
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRaw`
    ALTER TABLE "products"
      ADD COLUMN IF NOT EXISTS "conferente"      TEXT,
      ADD COLUMN IF NOT EXISTS "materiale1"      TEXT,
      ADD COLUMN IF NOT EXISTS "materiale2"      TEXT,
      ADD COLUMN IF NOT EXISTS "materiale3"      TEXT,
      ADD COLUMN IF NOT EXISTS "composizione"    TEXT,
      ADD COLUMN IF NOT EXISTS "certificazione1" TEXT,
      ADD COLUMN IF NOT EXISTS "certificazione2" TEXT,
      ADD COLUMN IF NOT EXISTS "certificazione3" TEXT,
      ADD COLUMN IF NOT EXISTS "fantasia"        TEXT,
      ADD COLUMN IF NOT EXISTS "lavorazione"     TEXT,
      ADD COLUMN IF NOT EXISTS "dettaglio"       TEXT
  `;
  console.log('✓ Nuove colonne aggiunte a products');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
