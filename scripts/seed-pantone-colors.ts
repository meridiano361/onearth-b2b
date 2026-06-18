/**
 * Importa il catalogo Pantone FHI-TCX da data/pantone-fhi-tcx.csv
 * e fa upsert idempotente su pantone_colors.
 *
 * Eseguire con:
 *   npx tsx --env-file=.env.local scripts/seed-pantone-colors.ts
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface ColorRow {
  code: string;
  name: string;
  hex_code: string;
}

function parseCSV(filePath: string): ColorRow[] {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n').filter((l) => l.trim() && !l.startsWith('#'));
  const rows: ColorRow[] = [];

  for (const line of lines) {
    // Skip header
    if (line.toLowerCase().startsWith('code')) continue;
    const parts = line.split(',');
    if (parts.length < 3) continue;
    const code = parts[0].trim();
    const name = parts[1].trim();
    const hex_code = parts[2].trim();
    if (!code || !name || !hex_code) continue;
    if (!hex_code.match(/^#[0-9A-Fa-f]{6}$/)) {
      console.warn(`  ⚠️  hex non valido per ${code}: "${hex_code}" — skip`);
      continue;
    }
    rows.push({ code, name, hex_code });
  }
  return rows;
}

async function main() {
  const csvPath = path.join(process.cwd(), 'data', 'pantone-fhi-tcx.csv');
  if (!fs.existsSync(csvPath)) {
    console.error(`❌ File non trovato: ${csvPath}`);
    process.exit(1);
  }

  const rows = parseCSV(csvPath);
  console.log(`── Seed Pantone FHI-TCX ──`);
  console.log(`   File: ${csvPath}`);
  console.log(`   Righe lette: ${rows.length}`);

  let inserted = 0;
  let skipped = 0;
  const BATCH = 100;

  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    // Build bulk INSERT ... ON CONFLICT DO UPDATE (single round-trip per batch)
    const values = batch
      .map((r) => `('${r.code.replace(/'/g, "''")}','${r.name.replace(/'/g, "''")}','${r.hex_code}','FHI-TCX')`)
      .join(',');
    const result = await prisma.$executeRawUnsafe(`
      INSERT INTO pantone_colors (code, name, hex_code, system_type)
      VALUES ${values}
      ON CONFLICT (code) DO UPDATE
        SET name = EXCLUDED.name,
            hex_code = EXCLUDED.hex_code,
            system_type = EXCLUDED.system_type
    `);
    inserted += Number(result);
    process.stdout.write(`\r   Progresso: ${Math.min(i + BATCH, rows.length)}/${rows.length}`);
  }

  const updated = 0;

  console.log(`\n\n✅ Completato`);
  console.log(`   Righe elaborate: ${rows.length}`);

  const total = await prisma.$queryRaw<{ n: bigint }[]>`SELECT COUNT(*)::bigint as n FROM pantone_colors`;
  console.log(`   Totale in DB: ${Number(total[0].n)}`);
}

main()
  .catch((e) => { console.error('\n❌ Errore:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
