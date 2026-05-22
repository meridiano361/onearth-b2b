import { prisma } from './prisma';
import { capFirst, upperAll } from './normalizeClassification';

type ClassFields = {
  nomLinea?: string | null;
  collezione?: string | null;
  colore?: string | null;
  temaColore?: string | null;
  stagione?: string | null;
  gruppoMerceologico?: string | null;
  famiglia?: string | null;
  classe?: string | null;
  sottoclasse?: string | null;
  gruppoOmogeneo?: string | null;
};

export async function syncProductClassification(f: ClassFields): Promise<void> {
  try {
    const flat: Promise<any>[] = [];
    if (f.nomLinea) {
      const n = upperAll(f.nomLinea);
      flat.push(prisma.linea.upsert({ where: { nome: n }, update: {}, create: { nome: n } }));
    }
    if (f.collezione) {
      const n = upperAll(f.collezione);
      flat.push(prisma.collezione.upsert({ where: { nome: n }, update: {}, create: { nome: n } }));
    }
    if (f.colore) {
      const n = capFirst(f.colore);
      flat.push(prisma.colore.upsert({ where: { nome: n }, update: {}, create: { nome: n } }));
    }
    if (f.temaColore) {
      const n = capFirst(f.temaColore);
      flat.push(prisma.temaColore.upsert({ where: { nome: n }, update: {}, create: { nome: n } }));
    }
    if (f.stagione) {
      const n = capFirst(f.stagione);
      flat.push(prisma.stagione.upsert({ where: { nome: n }, update: {}, create: { nome: n } }));
    }
    await Promise.all(flat);

    if (!f.gruppoMerceologico) return;
    const gmN = capFirst(f.gruppoMerceologico);
    const gm = await prisma.gruppoMerceologico.upsert({
      where: { nome: gmN }, update: {}, create: { nome: gmN },
    });

    if (!f.famiglia) return;
    const famN = capFirst(f.famiglia);
    const fam = await prisma.famiglia.upsert({
      where: { nome_gruppoMerceologicoId: { nome: famN, gruppoMerceologicoId: gm.id } },
      update: {},
      create: { nome: famN, gruppoMerceologicoId: gm.id },
    });

    if (!f.classe) return;
    const clsN = capFirst(f.classe);
    const cls = await prisma.classe.upsert({
      where: { nome_famigliaId: { nome: clsN, famigliaId: fam.id } },
      update: {},
      create: { nome: clsN, famigliaId: fam.id },
    });

    if (!f.sottoclasse) return;
    const subN = capFirst(f.sottoclasse);
    const sub = await prisma.sottoclasse.upsert({
      where: { nome_classeId: { nome: subN, classeId: cls.id } },
      update: {},
      create: { nome: subN, classeId: cls.id },
    });

    if (!f.gruppoOmogeneo) return;
    const goN = capFirst(f.gruppoOmogeneo);
    await prisma.gruppoOmogeneo.upsert({
      where: { nome_sottoclasseId: { nome: goN, sottoclasseId: sub.id } },
      update: {},
      create: { nome: goN, sottoclasseId: sub.id },
    });
  } catch (err) {
    console.error('[syncClassification] error:', err);
  }
}

export async function syncManyProductClassifications(fields: ClassFields[]): Promise<void> {
  // Deduplicate by full hierarchy key
  const seen = new Set<string>();
  const unique: ClassFields[] = [];
  for (const f of fields) {
    const key = [
      f.nomLinea || '',
      f.collezione || '',
      f.colore || '',
      f.temaColore || '',
      f.stagione || '',
      f.gruppoMerceologico || '',
      f.famiglia || '',
      f.classe || '',
      f.sottoclasse || '',
      f.gruppoOmogeneo || '',
    ].join('\0');
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(f);
    }
  }
  for (const f of unique) {
    await syncProductClassification(f);
  }
}
