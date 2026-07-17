/**
 * Merge varianti taglia PRISM in una singola scheda prodotto.
 *
 * Logica di raggruppamento:
 *  - S/M/L: stesso base-code (togliendo suffisso)
 *  - XL: base-code normalizzato (digit leading-zero rimossi) → same group as S/M/L
 *  - SM/LX: stesso base-code esatto
 *  - TU: singolo prodotto, solo strip del suffisso
 *
 * Risultato: una scheda per gruppo, sizeVariants JSON, codice = base.
 *
 * Uso:
 *   --dry-run  stampa solo cosa farebbe, senza modifiche
 *   (no flag)  esegue le modifiche
 */

import { prisma } from '../src/lib/prisma';

type SizeVariant = { taglia: string; codice: string };
type Prod = { id: string; code: string; name: string | null; misura: string | null };

const SIZE_SUFFIXES = ['XL', 'SM', 'LX', 'TU', 'L', 'M', 'S'] as const;
const TAGLIA_ORDER: Record<string, number> = { S: 1, SM: 1, M: 2, L: 3, LX: 3, XL: 4, TU: 5 };

function extractSize(code: string): { base: string; taglia: string } | null {
  for (const s of SIZE_SUFFIXES) {
    if (code.endsWith(s)) return { base: code.slice(0, -s.length), taglia: s };
  }
  return null;
}

// Normalizza base per matching: rimuove HUBPR e azzera leading-zeros nei digit
function normalizeBase(base: string): string {
  const s = base.startsWith('HUBPR') ? base.slice(5) : base;
  return s.replace(/\d+/g, (m) => String(parseInt(m, 10)));
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return dp[m][n];
}

async function main(dryRun: boolean) {
  console.log(`=== Merge varianti taglia PRISM ${dryRun ? '[DRY RUN]' : '[REALE]'} ===\n`);

  const prodotti = await prisma.product.findMany({
    where: { conferente: { contains: 'prism', mode: 'insensitive' } },
    select: { id: true, code: true, name: true, misura: true },
    orderBy: { code: 'asc' },
  });

  console.log(`Prodotti trovati: ${prodotti.length}\n`);

  // Separa per tipo di taglia
  const sml: { prod: Prod; base: string; taglia: string }[] = [];
  const xlItems: { prod: Prod; base: string; taglia: string }[] = [];
  const smLxItems: { prod: Prod; base: string; taglia: string }[] = [];
  const tuItems: { prod: Prod; base: string; taglia: string }[] = [];

  for (const p of prodotti) {
    const sz = extractSize(p.code);
    if (!sz) { console.warn(`  WARN: suffisso non trovato per ${p.code}`); continue; }
    if (['S', 'M', 'L'].includes(sz.taglia)) sml.push({ prod: p, ...sz });
    else if (sz.taglia === 'XL') xlItems.push({ prod: p, ...sz });
    else if (['SM', 'LX'].includes(sz.taglia)) smLxItems.push({ prod: p, ...sz });
    else if (sz.taglia === 'TU') tuItems.push({ prod: p, ...sz });
  }

  // Raggruppa S/M/L per base esatta
  const smlGroups = new Map<string, typeof sml>();
  for (const item of sml) {
    if (!smlGroups.has(item.base)) smlGroups.set(item.base, []);
    smlGroups.get(item.base)!.push(item);
  }

  // Mappa normalized → base per matching XL
  const normToBase = new Map<string, string>();
  for (const base of smlGroups.keys()) normToBase.set(normalizeBase(base), base);

  // Abbina ogni XL al gruppo S/M/L corrispondente
  const xlMatched = new Map<string, typeof xlItems[0]>();
  for (const xlItem of xlItems) {
    const normXL = normalizeBase(xlItem.base);
    if (normToBase.has(normXL)) {
      xlMatched.set(normToBase.get(normXL)!, xlItem);
      continue;
    }
    // Fallback fuzzy (gestisce typo come TDITS10 vs TDIT10)
    let bestBase: string | null = null, bestDist = 3;
    for (const [norm, base] of normToBase) {
      const d = levenshtein(normXL, norm);
      if (d < bestDist) { bestDist = d; bestBase = base; }
    }
    if (bestBase && bestDist <= 2) {
      console.log(`  Fuzzy XL: ${xlItem.prod.code} → ${bestBase} (distanza ${bestDist})`);
      xlMatched.set(bestBase, xlItem);
    } else {
      console.warn(`  WARN: nessun gruppo per XL ${xlItem.prod.code} (norm: ${normXL})`);
    }
  }

  // Raggruppa SM/LX per base
  const smLxGroups = new Map<string, typeof smLxItems>();
  for (const item of smLxItems) {
    if (!smLxGroups.has(item.base)) smLxGroups.set(item.base, []);
    smLxGroups.get(item.base)!.push(item);
  }

  // Costruisce gruppi finali
  type FinalGroup = { items: { prod: Prod; taglia: string }[]; masterBase: string };
  const finalGroups: FinalGroup[] = [];

  for (const [base, items] of smlGroups) {
    const all: { prod: Prod; taglia: string }[] = items.map(i => ({ prod: i.prod, taglia: i.taglia }));
    const xlItem = xlMatched.get(base);
    if (xlItem) all.push({ prod: xlItem.prod, taglia: xlItem.taglia });
    finalGroups.push({ items: all, masterBase: base });
  }
  for (const [base, items] of smLxGroups) {
    finalGroups.push({ items: items.map(i => ({ prod: i.prod, taglia: i.taglia })), masterBase: base });
  }
  for (const item of tuItems) {
    finalGroups.push({ items: [{ prod: item.prod, taglia: item.taglia }], masterBase: item.base });
  }

  console.log(`Gruppi finali: ${finalGroups.length}\n`);

  let merged = 0, singles = 0, errors = 0;
  const toDelete: string[] = [];

  for (const group of finalGroups) {
    group.items.sort((a, b) => (TAGLIA_ORDER[a.taglia] ?? 99) - (TAGLIA_ORDER[b.taglia] ?? 99));

    const master = group.items[0];
    const others = group.items.slice(1);
    const newCode = group.masterBase;

    const sizeVariants: SizeVariant[] = group.items.map(i => ({
      taglia: i.taglia,
      codice: i.prod.code,
    }));

    const taglie = sizeVariants.map(sv => sv.taglia).join('+');
    console.log(`  ${others.length > 0 ? 'MERGE' : 'SOLO '} ${newCode.padEnd(20)} [${taglie}]`);

    if (!dryRun) {
      try {
        await prisma.product.update({
          where: { id: master.prod.id },
          data: { code: newCode, sizeVariants: sizeVariants as any, taglia: null, misura: null },
        });
        if (others.length > 0) {
          toDelete.push(...others.map(o => o.prod.id));
          merged++;
        } else {
          singles++;
        }
      } catch (e: any) {
        console.error(`  ERRORE ${newCode}: ${e.message}`);
        errors++;
      }
    } else {
      if (others.length > 0) merged++; else singles++;
    }
  }

  if (!dryRun && toDelete.length > 0) {
    console.log(`\nEliminando ${toDelete.length} schede taglia-singola...`);
    const del = await prisma.product.deleteMany({ where: { id: { in: toDelete } } });
    console.log(`Eliminate: ${del.count}`);
  }

  const prodottiFinali = merged + singles;
  console.log(`\n=== ${dryRun ? '[DRY RUN] ' : ''}164 prodotti → ${prodottiFinali} schede: ${merged} uniti, ${singles} singoli, ${errors} errori ===`);
  await prisma.$disconnect();
}

const dryRun = process.argv[2] === '--dry-run';
main(dryRun).catch(e => { console.error(e); prisma.$disconnect(); process.exit(1); });
