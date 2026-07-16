/**
 * Migrazione — Prefisso HUBEQ per prodotti Equomercato
 *
 * Aggiunge "HUBEQ" al codice di tutti i prodotti con conferente = 'Equomercato'
 * che non iniziano già con "HUBEQ". Idempotente.
 *
 * Esecuzione: npx tsx --env-file=.env.local scripts/migrate-hubeq-codes.ts
 */

import { prisma } from '../src/lib/prisma';

async function main() {
  console.log('=== Migrazione codici HUBEQ per Equomercato ===\n');

  const prodotti = await prisma.product.findMany({
    where: { conferente: 'Equomercato' },
    select: { id: true, code: true },
  });

  const daMigrare = prodotti.filter((p) => !p.code.startsWith('HUBEQ'));

  console.log(`Prodotti Equomercato totali: ${prodotti.length}`);
  console.log(`Da aggiornare (senza prefisso HUBEQ): ${daMigrare.length}\n`);

  if (daMigrare.length === 0) {
    console.log('Nessuna modifica necessaria.');
    return;
  }

  let ok = 0;
  let err = 0;
  for (const p of daMigrare) {
    const newCode = 'HUBEQ' + p.code;
    try {
      await prisma.product.update({ where: { id: p.id }, data: { code: newCode } });
      console.log(`  ${p.code} → ${newCode}`);
      ok++;
    } catch (e: any) {
      console.error(`  ERRORE su ${p.code}: ${e.message}`);
      err++;
    }
  }

  console.log(`\n=== Completato: ${ok} aggiornati, ${err} errori ===`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1); });
