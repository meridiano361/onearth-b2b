import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return { h: 0, s: 0, l: 50 };
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: Math.round(l * 100) };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h = (h / 6) * 360;
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
}

async function main() {
  console.log('Step 1: Aggiunta colonne hue_angle e lightness a pantone_colors...');
  await prisma.$executeRaw`
    ALTER TABLE pantone_colors
      ADD COLUMN IF NOT EXISTS hue_angle  REAL,
      ADD COLUMN IF NOT EXISTS lightness  REAL
  `;
  console.log('  ✓ Colonne aggiunte');

  console.log('Step 2: Lettura di tutti i Pantone con hex_code...');
  const rows = await prisma.$queryRaw<{ id: bigint; hex_code: string; is_neutral: boolean }[]>`
    SELECT id, hex_code, is_neutral FROM pantone_colors WHERE hex_code IS NOT NULL AND hex_code != ''
  `;
  console.log(`  ✓ ${rows.length} Pantone trovati`);

  console.log('Step 3: Calcolo e salvataggio hue_angle / lightness...');
  let updated = 0;
  for (const row of rows) {
    const { h, s, l } = hexToHsl(row.hex_code);
    // Neutrals: very low saturation → hue_angle null, lightness stored
    const hueAngle = (row.is_neutral || s < 15) ? null : h;
    await prisma.$executeRaw`
      UPDATE pantone_colors
      SET hue_angle = ${hueAngle}, lightness = ${l}
      WHERE id = ${row.id}
    `;
    updated++;
  }
  console.log(`  ✓ ${updated} righe aggiornate`);
}

main()
  .then(() => { console.log('\n✅ Migrazione completata'); process.exit(0); })
  .catch((e) => { console.error('\n❌ Errore:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
