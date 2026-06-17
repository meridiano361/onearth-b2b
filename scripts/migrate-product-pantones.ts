import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Step 1: Creazione tabella product_pantones...');
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
  console.log('  ✓ product_pantones creata');

  console.log('Step 2: Aggiunta campi color wheel a pantone_colors...');
  await prisma.$executeRaw`
    ALTER TABLE pantone_colors
      ADD COLUMN IF NOT EXISTS hue_family  TEXT,
      ADD COLUMN IF NOT EXISTS temperature TEXT,
      ADD COLUMN IF NOT EXISTS is_neutral  BOOLEAN DEFAULT FALSE
  `;
  console.log('  ✓ hue_family, temperature, is_neutral aggiunti');

  console.log('Step 3: Migrazione dati pantone da products → product_pantones...');
  const migrated = await prisma.$executeRaw`
    INSERT INTO product_pantones (product_id, pantone_color_id, sort_order, is_primary)
    SELECT p.id, pc.id, 0, TRUE
    FROM   products p
    JOIN   pantone_colors pc ON pc.code = p.pantone_code
    WHERE  p.pantone_code IS NOT NULL
    ON CONFLICT (product_id, pantone_color_id) DO NOTHING
  `;
  console.log('  ✓ Righe migrate:', migrated);

  console.log('Step 4: Rimozione colonne pantone_* da products...');
  await prisma.$executeRaw`
    ALTER TABLE products
      DROP COLUMN IF EXISTS pantone_code,
      DROP COLUMN IF EXISTS pantone_name,
      DROP COLUMN IF EXISTS pantone_hex,
      DROP COLUMN IF EXISTS pantone_system_type
  `;
  console.log('  ✓ Colonne rimosse');
}

main()
  .then(() => { console.log('\n✅ Migrazione completata'); process.exit(0); })
  .catch((e) => { console.error('\n❌ Errore:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
