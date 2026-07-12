/**
 * Recupera materiale2/3 e colore2/3 dal file Excel OE27_bigio
 * per i prodotti già presenti nel DB che li hanno vuoti.
 *
 * Esegui con:  npx tsx scripts/recover-oe27-materials-colors.ts [--dry-run]
 */
import * as XLSX from 'xlsx';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes('--dry-run');

const FILE = path.resolve(
  process.env.HOME!,
  'Desktop/Modulo anagrafica prodotto moda per app OE27_bigio.xlsx',
);

function str(v: unknown): string | null {
  if (v === undefined || v === null || v === '') return null;
  return String(v).trim() || null;
}

async function main() {
  console.log(DRY_RUN ? '[DRY RUN]' : '[LIVE]', 'Reading', FILE);

  const wb = XLSX.readFile(FILE);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws) as Record<string, unknown>[];

  console.log(`Righe nel file: ${rows.length}`);

  let updated = 0;
  let skipped = 0;
  let notFound = 0;

  for (const row of rows) {
    const code = str(row['Codice']);
    if (!code) { skipped++; continue; }
    const upperCode = code.toUpperCase();

    const patch: Record<string, string | null> = {};

    const m1 = str(row['Materiale 1']);
    const m2 = str(row['Materiale 2']);
    const m3 = str(row['Materiale 3']);
    const c1 = str(row['Colore 1']);
    const c2 = str(row['Colore 2']);
    const c3 = str(row['Colore 3']);
    const cAltri = str(row['Altri colori']);
    const lavorazione = str(row['Lavorazione']);
    const fantasia = str(row['Fantasia']);

    if (m1 !== null) patch.materiale1 = m1;
    if (m2 !== null) patch.materiale2 = m2;
    if (m3 !== null) patch.materiale3 = m3;
    if (c1 !== null) patch.colore = c1;
    if (c2 !== null) patch.colore2 = c2;
    if (c3 !== null) patch.colore3 = c3;
    if (cAltri !== null) patch.altriColori = cAltri;
    if (lavorazione !== null) patch.lavorazione = lavorazione;
    if (fantasia !== null) patch.fantasia = fantasia;

    if (Object.keys(patch).length === 0) { skipped++; continue; }

    const product = await prisma.product.findFirst({ where: { code: upperCode }, select: { id: true, code: true } });
    if (!product) {
      notFound++;
      console.log(`  ✗ Non trovato: ${upperCode}`);
      continue;
    }

    if (DRY_RUN) {
      console.log(`  [DRY] ${upperCode} →`, patch);
    } else {
      await prisma.product.update({ where: { id: product.id }, data: patch });
      console.log(`  ✓ ${upperCode}`);
    }
    updated++;
  }

  console.log(`\nRisultato: ${updated} ${DRY_RUN ? 'da aggiornare' : 'aggiornati'}, ${skipped} saltati, ${notFound} non trovati`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
