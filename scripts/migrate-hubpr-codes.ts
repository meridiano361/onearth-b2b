/**
 * Migrazione — Prefisso HUBPR per prodotti Prism
 *
 * Aggiunge "HUBPR" al codice di tutti i prodotti con conferente = 'Prism'
 * che non iniziano già con "HUBPR". Idempotente.
 *
 * Esecuzione: npx tsx --env-file=.env.local scripts/migrate-hubpr-codes.ts
 */

import { prisma } from '../src/lib/prisma';

async function main() {
  console.log('=== Migrazione codici HUBPR per Prism ===\n');

  const prodotti = await prisma.product.findMany({
    where: { conferente: { contains: 'prism', mode: 'insensitive' } },
    select: { id: true, code: true, conferente: true, isActive: true },
  });

  console.log(`Prodotti Prism trovati: ${prodotti.length}`);
  prodotti.forEach((p) => console.log(`  ${p.code} | conferente: ${p.conferente} | active: ${p.isActive}`));

  const daMigrare = prodotti.filter((p) => !p.code.startsWith('HUBPR'));

  console.log(`\nDa aggiornare (senza prefisso HUBPR): ${daMigrare.length}\n`);

  if (daMigrare.length === 0) {
    console.log('Nessuna modifica necessaria.');
    await prisma.$disconnect();
    return;
  }

  let ok = 0;
  let err = 0;
  for (const p of daMigrare) {
    const newCode = 'HUBPR' + p.code;
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
