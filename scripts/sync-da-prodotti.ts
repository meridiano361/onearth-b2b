// Sincronizza le tabelle di classificazione leggendo i valori distinti dalla tabella Product.
// Uso: npx tsx scripts/sync-da-prodotti.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function capFirst(s: string): string {
  const t = s.trim();
  return t ? t.charAt(0).toUpperCase() + t.slice(1).toLowerCase() : t;
}

function upperAll(s: string): string {
  return s.trim().toUpperCase();
}

type Counter = { added: number; skipped: number };

async function syncFlat(
  label: string,
  values: string[],
  normFn: (s: string) => string,
  delegate: any,
): Promise<Counter> {
  const unique = [...new Set(values.map(normFn).filter(Boolean))];
  let added = 0;
  for (const nome of unique) {
    const existing = await delegate.findUnique({ where: { nome } });
    if (!existing) {
      await delegate.create({ data: { nome } });
      added++;
    }
  }
  console.log(`  ${label}: ${added} aggiunti, ${unique.length - added} già presenti`);
  return { added, skipped: unique.length - added };
}

async function main() {
  console.log('🔍 Lettura valori distinti dalla tabella Product...\n');

  const products = await prisma.product.findMany({
    select: {
      nomLinea: true,
      collezione: true,
      colore: true,
      temaColore: true,
      stagione: true,
      gruppoMerceologico: true,
      famiglia: true,
      classe: true,
      sottoclasse: true,
      gruppoOmogeneo: true,
    },
  });

  const get = (field: keyof typeof products[0]) =>
    products.map((p) => p[field] as string | null).filter(Boolean) as string[];

  console.log(`📦 Trovati ${products.length} prodotti totali\n`);
  console.log('── Tabelle piatte ──────────────────────────────────────');

  let totalAdded = 0;

  const r1 = await syncFlat('Linea (nomLinea)', get('nomLinea'), upperAll, prisma.linea);
  totalAdded += r1.added;

  const r2 = await syncFlat('Collezione', get('collezione'), upperAll, prisma.collezione);
  totalAdded += r2.added;

  const r3 = await syncFlat('Colore', get('colore'), capFirst, prisma.colore);
  totalAdded += r3.added;

  const r4 = await syncFlat('TemaColore', get('temaColore'), capFirst, prisma.temaColore);
  totalAdded += r4.added;

  const r5 = await syncFlat('Stagione', get('stagione'), capFirst, prisma.stagione);
  totalAdded += r5.added;

  console.log('\n── Gerarchia (GruppoMerceologico → GruppoOmogeneo) ────');

  // Build unique hierarchy tuples from products
  type HierarchyTuple = {
    gm: string; fam?: string; cls?: string; sub?: string; go?: string;
  };
  const hierarchies = new Map<string, HierarchyTuple>();

  for (const p of products) {
    if (!p.gruppoMerceologico) continue;
    const gm = capFirst(p.gruppoMerceologico);
    const fam = p.famiglia ? capFirst(p.famiglia) : undefined;
    const cls = p.classe ? capFirst(p.classe) : undefined;
    const sub = p.sottoclasse ? capFirst(p.sottoclasse) : undefined;
    const go = p.gruppoOmogeneo ? capFirst(p.gruppoOmogeneo) : undefined;
    const key = [gm, fam, cls, sub, go].join('\0');
    if (!hierarchies.has(key)) hierarchies.set(key, { gm, fam, cls, sub, go });
  }

  let gmAdded = 0, famAdded = 0, clsAdded = 0, subAdded = 0, goAdded = 0;

  for (const h of hierarchies.values()) {
    const existGm = await prisma.gruppoMerceologico.findUnique({ where: { nome: h.gm } });
    let gmId: string;
    if (!existGm) {
      const created = await prisma.gruppoMerceologico.create({ data: { nome: h.gm } });
      gmId = created.id;
      gmAdded++;
    } else {
      gmId = existGm.id;
    }

    if (!h.fam) continue;
    const existFam = await prisma.famiglia.findUnique({
      where: { nome_gruppoMerceologicoId: { nome: h.fam, gruppoMerceologicoId: gmId } },
    });
    let famId: string;
    if (!existFam) {
      const created = await prisma.famiglia.create({ data: { nome: h.fam, gruppoMerceologicoId: gmId } });
      famId = created.id;
      famAdded++;
    } else {
      famId = existFam.id;
    }

    if (!h.cls) continue;
    const existCls = await prisma.classe.findUnique({
      where: { nome_famigliaId: { nome: h.cls, famigliaId: famId } },
    });
    let clsId: string;
    if (!existCls) {
      const created = await prisma.classe.create({ data: { nome: h.cls, famigliaId: famId } });
      clsId = created.id;
      clsAdded++;
    } else {
      clsId = existCls.id;
    }

    if (!h.sub) continue;
    const existSub = await prisma.sottoclasse.findUnique({
      where: { nome_classeId: { nome: h.sub, classeId: clsId } },
    });
    let subId: string;
    if (!existSub) {
      const created = await prisma.sottoclasse.create({ data: { nome: h.sub, classeId: clsId } });
      subId = created.id;
      subAdded++;
    } else {
      subId = existSub.id;
    }

    if (!h.go) continue;
    const existGo = await prisma.gruppoOmogeneo.findUnique({
      where: { nome_sottoclasseId: { nome: h.go, sottoclasseId: subId } },
    });
    if (!existGo) {
      await prisma.gruppoOmogeneo.create({ data: { nome: h.go, sottoclasseId: subId } });
      goAdded++;
    }
  }

  console.log(`  GruppoMerceologico: ${gmAdded} aggiunti`);
  console.log(`  Famiglia: ${famAdded} aggiunti`);
  console.log(`  Classe: ${clsAdded} aggiunte`);
  console.log(`  Sottoclasse: ${subAdded} aggiunte`);
  console.log(`  GruppoOmogeneo: ${goAdded} aggiunti`);
  totalAdded += gmAdded + famAdded + clsAdded + subAdded + goAdded;

  console.log(`\n✅ Sincronizzazione completata: ${totalAdded} valori totali aggiunti`);
}

main()
  .catch((e) => { console.error('❌ Errore:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
