/**
 * Ricrea le tabelle raw droppate accidentalmente da `prisma db push`.
 * Ricrea: color_blocks, pantone_colors, product_color_blocks, product_pantones
 *
 * NOTA: pantone_colors sarà vuota — è necessario reimportare i dati Pantone FHI-TCX.
 *
 * Eseguire con:
 *   npx tsx scripts/recover-raw-tables.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('── Recovery tabelle raw ──');

  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS color_blocks (
      id         SERIAL PRIMARY KEY,
      name       TEXT NOT NULL UNIQUE,
      sort_order INT  NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  console.log('✓ color_blocks ricreata');

  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS pantone_colors (
      id          BIGSERIAL PRIMARY KEY,
      code        TEXT NOT NULL,
      name        TEXT NOT NULL,
      hex_code    TEXT,
      system_type TEXT NOT NULL DEFAULT 'FHI-TCX',
      hue_family  TEXT,
      temperature TEXT,
      is_neutral  BOOLEAN DEFAULT FALSE,
      hue_angle   REAL,
      lightness   REAL
    )
  `;
  console.log('✓ pantone_colors ricreata (vuota — reimportare dati FHI-TCX)');

  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS product_color_blocks (
      id             BIGSERIAL PRIMARY KEY,
      product_id     TEXT    NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      color_block_id INT     NOT NULL REFERENCES color_blocks(id) ON DELETE CASCADE,
      created_at     TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(product_id, color_block_id)
    )
  `;
  console.log('✓ product_color_blocks ricreata');

  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS product_pantones (
      id               BIGSERIAL PRIMARY KEY,
      product_id       TEXT    NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      pantone_color_id BIGINT  NOT NULL REFERENCES pantone_colors(id) ON DELETE CASCADE,
      sort_order       INT     NOT NULL DEFAULT 0,
      is_primary       BOOLEAN NOT NULL DEFAULT FALSE,
      created_at       TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(product_id, pantone_color_id)
    )
  `;
  console.log('✓ product_pantones ricreata');

  console.log('\n✅ Tabelle ricreate.');
  console.log('⚠️  pantone_colors è vuota: re-importare i dati Pantone FHI-TCX.');
  console.log('   Una volta importati, rieseguire: npx tsx scripts/add-pantone-hue-fields.ts');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
