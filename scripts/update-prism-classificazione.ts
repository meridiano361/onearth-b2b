/**
 * Aggiorna i prodotti PRISM: gruppoMerceologico=MODA, collezione=PE27, stagione=PE
 */

import { prisma } from '../src/lib/prisma';

async function main() {
  console.log('=== Aggiornamento classificazione prodotti PRISM ===\n');

  const result = await prisma.product.updateMany({
    where: { conferente: { contains: 'prism', mode: 'insensitive' } },
    data: {
      gruppoMerceologico: 'MODA',
      collezione: 'PE27',
      stagione: 'PE',
    },
  });

  console.log(`Aggiornati: ${result.count} prodotti → MODA / PE27 / PE`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1); });
