/**
 * Migrazione — MODA PE27: UPPERCASE → sentence case
 *
 * Rinomina tutti i record dell'albero MODA nelle tabelle di classificazione
 * da UPPERCASE (es. "ABBIGLIAMENTO") a sentence case (es. "Abbigliamento").
 *
 * Idempotente: se il valore è già in sentence case, l'update è un no-op.
 * Non tocca l'albero "Casa e regalo".
 *
 * Esecuzione: npx tsx --env-file=.env.local scripts/migrate-moda-sentencecase.ts
 */

import { prisma } from '../src/lib/prisma';

function sc(s: string): string {
  const t = s.trim();
  return t ? t.charAt(0).toUpperCase() + t.slice(1).toLowerCase() : t;
}

async function main() {
  console.log('=== Migrazione MODA: UPPERCASE → sentence case ===\n');

  // 1 — GruppoMerceologico
  const gm = await prisma.gruppoMerceologico.findUnique({ where: { nome: 'MODA' } });
  if (!gm) { console.log('Nessun record "MODA" trovato — migrazione già applicata o non necessaria.'); return; }

  await prisma.gruppoMerceologico.update({ where: { id: gm.id }, data: { nome: sc(gm.nome) } });
  console.log(`[GM]  ${gm.nome} → ${sc(gm.nome)}`);

  // 2 — Famiglie
  const famiglie = await prisma.famiglia.findMany({ where: { gruppoMerceologicoId: gm.id } });
  for (const f of famiglie) {
    await prisma.famiglia.update({ where: { id: f.id }, data: { nome: sc(f.nome) } });
    console.log(`[FAM] ${f.nome} → ${sc(f.nome)}`);
  }

  // 3 — Classi
  const classi = await prisma.classe.findMany({ where: { famigliaId: { in: famiglie.map(f => f.id) } } });
  for (const c of classi) {
    await prisma.classe.update({ where: { id: c.id }, data: { nome: sc(c.nome) } });
    console.log(`[CLS] ${c.nome} → ${sc(c.nome)}`);
  }

  // 4 — Sottoclassi
  const sottoclassi = await prisma.sottoclasse.findMany({ where: { classeId: { in: classi.map(c => c.id) } } });
  for (const s of sottoclassi) {
    await prisma.sottoclasse.update({ where: { id: s.id }, data: { nome: sc(s.nome) } });
    console.log(`[SUB] ${s.nome} → ${sc(s.nome)}`);
  }

  // 5 — Gruppi omogenei
  const gruppi = await prisma.gruppoOmogeneo.findMany({ where: { sottoclasseId: { in: sottoclassi.map(s => s.id) } } });
  for (const g of gruppi) {
    await prisma.gruppoOmogeneo.update({ where: { id: g.id }, data: { nome: sc(g.nome) } });
    console.log(`[GO]  ${g.nome} → ${sc(g.nome)}`);
  }

  console.log(`\n=== Completato ===`);
  console.log(`  GM:          1`);
  console.log(`  Famiglie:    ${famiglie.length}`);
  console.log(`  Classi:      ${classi.length}`);
  console.log(`  Sottoclassi: ${sottoclassi.length}`);
  console.log(`  Gruppi om.:  ${gruppi.length}`);
  console.log(`  Totale:      ${1 + famiglie.length + classi.length + sottoclassi.length + gruppi.length}`);

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); prisma.$disconnect(); process.exit(1); });
