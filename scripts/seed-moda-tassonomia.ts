/**
 * Seed script — Albero merceologico MODA PE27
 *
 * Popola le tabelle di classificazione con la gerarchia completa MODA PE27.
 * - Idempotente: usa upsert su tutti i livelli, nessun duplicato
 * - Non distruttivo: il ramo "Casa e regalo" non viene toccato
 * - Fonte di verità: src/lib/modaTassonomia.ts
 *
 * Esecuzione: npx tsx --env-file=.env.local scripts/seed-moda-tassonomia.ts
 */

import { prisma } from '../src/lib/prisma';
import { MODA_GRUPPO_MERCEOLOGICO, MODA_TASSONOMIA } from '../src/lib/modaTassonomia';

async function main() {
  console.log('=== Seed MODA PE27 — start ===\n');

  let countFamiglie = 0;
  let countClassi = 0;
  let countSottoclassi = 0;
  let countGruppiOmogenei = 0;

  // 1 — GruppoMerceologico
  const gm = await prisma.gruppoMerceologico.upsert({
    where: { nome: MODA_GRUPPO_MERCEOLOGICO },
    update: {},
    create: { nome: MODA_GRUPPO_MERCEOLOGICO },
  });
  console.log(`[GM]  ${gm.nome}  (${gm.id})`);

  // 2 — Iterate famiglie → classi → sottoclassi → gruppi omogenei
  for (const [famNome, classiMap] of Object.entries(MODA_TASSONOMIA)) {
    const fam = await prisma.famiglia.upsert({
      where: { nome_gruppoMerceologicoId: { nome: famNome, gruppoMerceologicoId: gm.id } },
      update: {},
      create: { nome: famNome, gruppoMerceologicoId: gm.id },
    });
    countFamiglie++;
    console.log(`\n  [FAM] ${famNome}`);

    for (const [clsNome, sottoclassiMap] of Object.entries(classiMap)) {
      const cls = await prisma.classe.upsert({
        where: { nome_famigliaId: { nome: clsNome, famigliaId: fam.id } },
        update: {},
        create: { nome: clsNome, famigliaId: fam.id },
      });
      countClassi++;
      console.log(`    [CLS] ${clsNome}`);

      for (const [subNome, gruppiList] of Object.entries(sottoclassiMap)) {
        const sub = await prisma.sottoclasse.upsert({
          where: { nome_classeId: { nome: subNome, classeId: cls.id } },
          update: {},
          create: { nome: subNome, classeId: cls.id },
        });
        countSottoclassi++;
        console.log(`      [SUB] ${subNome}`);

        for (const goNome of gruppiList) {
          await prisma.gruppoOmogeneo.upsert({
            where: { nome_sottoclasseId: { nome: goNome, sottoclasseId: sub.id } },
            update: {},
            create: { nome: goNome, sottoclasseId: sub.id },
          });
          countGruppiOmogenei++;
          console.log(`        [GO]  ${goNome}`);
        }
      }
    }
  }

  console.log('\n=== Seed MODA PE27 — completato ===');
  console.log(`  GruppoMerceologico : 1`);
  console.log(`  Famiglie           : ${countFamiglie}`);
  console.log(`  Classi             : ${countClassi}`);
  console.log(`  Sottoclassi        : ${countSottoclassi}`);
  console.log(`  Gruppi omogenei    : ${countGruppiOmogenei}`);
  console.log(`  Totale record      : ${1 + countFamiglie + countClassi + countSottoclassi + countGruppiOmogenei}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
