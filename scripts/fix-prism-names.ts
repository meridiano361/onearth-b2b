/**
 * Genera il nome corretto per i prodotti PRISM seguendo la regola MODA:
 *   {dettaglio} {NOMLINEA} {materiali senza %} {colore}
 *
 * Usa: --dry-run per anteprima senza modifiche
 */

import { prisma } from '../src/lib/prisma';

function extractMatName(mat: string | null): string | null {
  if (!mat?.trim()) return null;
  // Strip leading percentage: "87% Viscosa" → "viscosa", "100% cotone" → "cotone"
  return mat.replace(/^\d+[\.,]?\d*\s*%\s*/i, '').trim().toLowerCase() || null;
}

function buildName(p: {
  dettaglio: string | null;
  nomLinea: string | null;
  materiale1: string | null;
  materiale2: string | null;
  materiale3: string | null;
  colore: string | null;
}): string | null {
  if (!p.dettaglio?.trim()) return null;

  const parts: string[] = [];

  // 1. Tipo capo (dettaglio)
  const det = p.dettaglio.trim();
  parts.push(det.charAt(0).toUpperCase() + det.slice(1).toLowerCase());

  // 2. Linea in MAIUSCOLO
  if (p.nomLinea?.trim()) {
    parts.push(p.nomLinea.trim().toUpperCase());
  }

  // 3. Materiali senza percentuale
  for (const mat of [p.materiale1, p.materiale2, p.materiale3]) {
    const name = extractMatName(mat);
    if (name) parts.push(name);
  }

  // 4. Colore in minuscolo
  if (p.colore?.trim()) {
    parts.push(p.colore.trim().toLowerCase());
  }

  return parts.join(' ');
}

async function main(dryRun: boolean) {
  console.log(`=== Fix nomi PRISM ${dryRun ? '[DRY RUN]' : '[REALE]'} ===\n`);

  const prods = await prisma.product.findMany({
    where: { conferente: { contains: 'prism', mode: 'insensitive' } },
    select: { id: true, code: true, name: true, nomLinea: true, dettaglio: true, colore: true, materiale1: true, materiale2: true, materiale3: true },
    orderBy: { code: 'asc' },
  });

  console.log(`Prodotti PRISM: ${prods.length}\n`);

  let updated = 0, skipped = 0, noData = 0;

  for (const p of prods) {
    const newName = buildName(p);

    if (!newName) {
      console.warn(`  NO-DATA  ${p.code} — nessun dettaglio, skip`);
      noData++;
      continue;
    }

    if (p.name === newName) {
      console.log(`  OK       ${p.code.padEnd(20)} "${p.name}"`);
      skipped++;
      continue;
    }

    console.log(`  UPDATE   ${p.code.padEnd(20)} "${p.name}" → "${newName}"`);

    if (!dryRun) {
      await prisma.product.update({ where: { id: p.id }, data: { name: newName } });
    }
    updated++;
  }

  console.log(`\n=== ${updated} aggiornati, ${skipped} già corretti, ${noData} senza dati ===`);
  await prisma.$disconnect();
}

const dryRun = process.argv[2] === '--dry-run';
main(dryRun).catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1); });
