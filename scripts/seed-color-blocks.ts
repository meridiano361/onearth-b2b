/**
 * Seed dei blocchi colore MODA in color_blocks.
 * Idempotente: INSERT ... ON CONFLICT DO NOTHING
 *
 * Eseguire con:
 *   npx tsx --env-file=.env.local scripts/seed-color-blocks.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const BLOCKS = [
  { name: 'Toni Caldi',    sort_order: 1 },
  { name: 'Toni Freddi',   sort_order: 2 },
  { name: 'Toni Neutri',   sort_order: 3 },
  { name: 'Toni Naturali', sort_order: 4 },
  { name: 'Toni Vivaci',   sort_order: 5 },
];

async function main() {
  console.log('── Seed color_blocks ──');
  for (const b of BLOCKS) {
    await prisma.$executeRaw`
      INSERT INTO color_blocks (name, sort_order)
      VALUES (${b.name}, ${b.sort_order})
      ON CONFLICT (name) DO UPDATE SET sort_order = EXCLUDED.sort_order
    `;
    console.log(`✓ ${b.name}`);
  }
  const count = await prisma.$queryRaw<{ count: bigint }[]>`SELECT COUNT(*)::bigint FROM color_blocks`;
  console.log(`\n✅ color_blocks: ${Number(count[0].count)} righe totali`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
