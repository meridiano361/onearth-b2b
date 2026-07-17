import { prisma } from '../src/lib/prisma';

const SIZE_SUFFIXES = ['XL', 'SM', 'LX', 'TU', 'L', 'M', 'S'] as const;

function extractSize(code: string): { base: string; taglia: string } | null {
  for (const s of SIZE_SUFFIXES) {
    if (code.endsWith(s)) return { base: code.slice(0, -s.length), taglia: s };
  }
  return null;
}

async function main() {
  const prodotti = await prisma.product.findMany({
    where: { conferente: { contains: 'prism', mode: 'insensitive' } },
    select: { id: true, code: true, name: true, misura: true },
    orderBy: { code: 'asc' },
  });

  console.log('=== Campione (prime 20 righe) ===');
  for (const p of prodotti.slice(0, 20)) {
    const sz = extractSize(p.code);
    console.log(`  code: ${p.code.padEnd(22)} name: ${String(p.name).slice(0,40).padEnd(40)} misura: ${p.misura ?? '-'} → taglia: ${sz?.taglia ?? '?'}`);
  }

  // Group by name
  const byName = new Map<string, typeof prodotti>();
  for (const p of prodotti) {
    const k = (p.name ?? '').toLowerCase().trim();
    if (!byName.has(k)) byName.set(k, []);
    byName.get(k)!.push(p);
  }

  console.log(`\n=== Gruppi per nome (${byName.size} gruppi da ${prodotti.length} prodotti) ===`);
  for (const [name, group] of byName) {
    const label = name.slice(0, 35).padEnd(35);
    console.log(`  "${label}" → ${group.map(p => p.code).join(', ')}`);
  }
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); prisma.$disconnect(); process.exit(1); });
