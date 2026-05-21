import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

function calcFasciaSconto(costPrice: number, retailPrice: number, iva: number): number {
  const ivaFactor = 1 + iva / 100;
  const retailNet = retailPrice / ivaFactor;
  const sconto = (1 - costPrice / retailNet) * 100;
  return Math.round(sconto * 10) / 10;
}

async function main() {
  const all = await prisma.product.findMany({
    select: { id: true, code: true, costPrice: true, retailPrice: true, iva: true, fasciaSconto: true },
  });

  let updated = 0;
  let skippedNoPrices = 0;
  let skippedNegative = 0;
  const inconsistent: { code: string; existing: number; calculated: number; diff: number }[] = [];

  for (const p of all) {
    const cost   = p.costPrice   ? Number(p.costPrice)   : 0;
    const retail = p.retailPrice ? Number(p.retailPrice) : 0;
    const iva    = p.iva         ? Number(p.iva)         : 22;

    const needsCalc = p.fasciaSconto === null || Number(p.fasciaSconto) === 0;

    if (!needsCalc) {
      // Verify consistency for already-set values
      if (cost > 0 && retail > 0) {
        const calculated = calcFasciaSconto(cost, retail, iva);
        const existing   = Number(p.fasciaSconto);
        const diff       = Math.abs(calculated - existing);
        if (diff > 5) {
          inconsistent.push({ code: p.code, existing, calculated, diff: Math.round(diff * 10) / 10 });
        }
      }
      continue;
    }

    if (cost <= 0 || retail <= 0) {
      skippedNoPrices++;
      continue;
    }

    const sconto = calcFasciaSconto(cost, retail, iva);

    if (sconto < 0 || sconto >= 100) {
      skippedNegative++;
      console.log(`  SKIP ${p.code}: sconto calcolato fuori range (${sconto.toFixed(1)}%) — costo=${cost}, vendita=${retail}`);
      continue;
    }

    await prisma.product.update({ where: { id: p.id }, data: { fasciaSconto: new Prisma.Decimal(sconto) } });
    updated++;
  }

  console.log('\n=== Calcolo fasciaSconto ===\n');
  console.log(`Prodotti aggiornati:              ${updated}`);
  console.log(`Saltati (prezzi mancanti/zero):   ${skippedNoPrices}`);
  console.log(`Saltati (sconto fuori range):     ${skippedNegative}`);

  if (inconsistent.length) {
    console.log(`\nPossibili incongruenze (diff > 5pp) — ${inconsistent.length} prodotti:`);
    for (const r of inconsistent) {
      console.log(`  ${r.code.padEnd(18)} esistente=${r.existing.toFixed(1).padStart(5)}%  calcolato=${r.calculated.toFixed(1).padStart(5)}%  diff=${r.diff.toFixed(1)}pp`);
    }
  } else {
    console.log('\nNessuna incongruenza rilevata nei prodotti esistenti.');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
