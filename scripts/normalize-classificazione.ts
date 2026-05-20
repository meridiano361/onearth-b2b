// Normalizza i valori di classificazione nel DB:
// - Prima lettera maiuscola, resto minuscolo per la maggior parte dei campi
// - TUTTO MAIUSCOLO per il campo linea/nomLinea
// - Raggruppa i duplicati (es. "CASA E REGALO" e "Casa e regalo" → "Casa e regalo")
// Uso: npx tsx scripts/normalize-classificazione.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function capFirst(s: string): string {
  const t = s.trim();
  return t ? t.charAt(0).toUpperCase() + t.slice(1).toLowerCase() : t;
}

function upperAll(s: string): string {
  return s.trim().toUpperCase();
}

async function normalizeTable(
  label: string,
  delegate: any,
  normFn: (s: string) => string,
  childConfig?: { childDelegate: any; parentField: string }
): Promise<{ normalized: number; merged: number }> {
  const all: any[] = await delegate.findMany({ orderBy: { nome: 'asc' } });
  let normalized = 0;
  let merged = 0;

  const groups = new Map<string, any[]>();
  for (const item of all) {
    const key = normFn(item.nome);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  }

  for (const [normName, group] of groups) {
    const [keeper, ...dups] = group;

    for (const dup of dups) {
      if (childConfig) {
        // Reassign children of duplicate to keeper
        await childConfig.childDelegate.updateMany({
          where: { [childConfig.parentField]: dup.id },
          data: { [childConfig.parentField]: keeper.id },
        });
      }
      await delegate.delete({ where: { id: dup.id } });
      merged++;
    }

    if (keeper.nome !== normName) {
      await delegate.update({ where: { id: keeper.id }, data: { nome: normName } });
      normalized++;
    }
  }

  console.log(`  ${label}: ${normalized} normalizzati, ${merged} duplicati unificati`);
  return { normalized, merged };
}

async function normalizeProductFields(): Promise<{ normalized: number }> {
  const products = await prisma.product.findMany({
    select: {
      id: true,
      gruppoMerceologico: true, famiglia: true, classe: true,
      sottoclasse: true, gruppoOmogeneo: true, nomLinea: true,
      colore: true, temaColore: true, stagione: true,
      produttore: true, collezione: true,
    },
  });

  let normalized = 0;

  for (const p of products) {
    const data: Record<string, string> = {};

    const capFields = [
      'gruppoMerceologico', 'famiglia', 'classe', 'sottoclasse', 'gruppoOmogeneo',
      'colore', 'temaColore', 'stagione', 'produttore', 'collezione',
    ] as const;

    for (const f of capFields) {
      const val = (p as any)[f];
      if (val) {
        const norm = capFirst(val);
        if (norm !== val) data[f] = norm;
      }
    }

    if (p.nomLinea) {
      const norm = upperAll(p.nomLinea);
      if (norm !== p.nomLinea) data.nomLinea = norm;
    }

    if (Object.keys(data).length > 0) {
      await prisma.product.update({ where: { id: p.id }, data });
      normalized++;
    }
  }

  console.log(`  Prodotti: ${normalized} aggiornati`);
  return { normalized };
}

async function main() {
  console.log('🔄 Normalizzazione valori classificazione...\n');
  let totalNorm = 0;
  let totalMerged = 0;

  const add = (r: { normalized: number; merged?: number }) => {
    totalNorm += r.normalized;
    totalMerged += r.merged ?? 0;
  };

  // Top-level tables
  add(await normalizeTable('GruppoMerceologico', prisma.gruppoMerceologico, capFirst, {
    childDelegate: prisma.famiglia,
    parentField: 'gruppoMerceologicoId',
  }));
  add(await normalizeTable('Stagione', prisma.stagione, capFirst));
  add(await normalizeTable('Collezione', prisma.collezione, capFirst));
  add(await normalizeTable('Colore', prisma.colore, capFirst));
  add(await normalizeTable('TemaColore', prisma.temaColore, capFirst));
  add(await normalizeTable('Linea', prisma.linea, upperAll));

  // Hierarchical (bottom-up to avoid FK conflicts)
  add(await normalizeTable('GruppoOmogeneo', prisma.gruppoOmogeneo, capFirst));
  add(await normalizeTable('Sottoclasse', prisma.sottoclasse, capFirst, {
    childDelegate: prisma.gruppoOmogeneo,
    parentField: 'sottoclasseId',
  }));
  add(await normalizeTable('Classe', prisma.classe, capFirst, {
    childDelegate: prisma.sottoclasse,
    parentField: 'classeId',
  }));
  add(await normalizeTable('Famiglia', prisma.famiglia, capFirst, {
    childDelegate: prisma.classe,
    parentField: 'famigliaId',
  }));

  const { normalized: prodNorm } = await normalizeProductFields();
  totalNorm += prodNorm;

  console.log(`\n✅ Completato: ${totalNorm} valori normalizzati, ${totalMerged} duplicati unificati`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
