import { prisma } from './prisma';
import { upperAll } from './normalizeClassification';

function trimOrNull(s: string | null | undefined): string | null {
  if (!s) return null;
  const t = s.trim();
  return t || null;
}

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
      const n = trimOrNull(f.colore);
      if (n) flat.push(prisma.colore.upsert({ where: { nome: n }, update: {}, create: { nome: n } }));
    }
    if (f.temaColore) {
      const n = trimOrNull(f.temaColore);
      if (n) flat.push(prisma.temaColore.upsert({ where: { nome: n }, update: {}, create: { nome: n } }));
    }
    if (f.stagione) {
      const n = trimOrNull(f.stagione);
      if (n) flat.push(prisma.stagione.upsert({ where: { nome: n }, update: {}, create: { nome: n } }));
    }
    await Promise.all(flat);

    if (!f.gruppoMerceologico) return;
    const gmN = trimOrNull(f.gruppoMerceologico);
    if (!gmN) return;
    const gm = await prisma.gruppoMerceologico.upsert({
      where: { nome: gmN }, update: {}, create: { nome: gmN },
    });

    if (!f.famiglia) return;
    const famN = trimOrNull(f.famiglia);
    if (!famN) return;
    const fam = await prisma.famiglia.upsert({
      where: { nome_gruppoMerceologicoId: { nome: famN, gruppoMerceologicoId: gm.id } },
      update: {},
      create: { nome: famN, gruppoMerceologicoId: gm.id },
    });

    if (!f.classe) return;
    const clsN = trimOrNull(f.classe);
    if (!clsN) return;
    const cls = await prisma.classe.upsert({
      where: { nome_famigliaId: { nome: clsN, famigliaId: fam.id } },
      update: {},
      create: { nome: clsN, famigliaId: fam.id },
    });

    if (!f.sottoclasse) return;
    const subN = trimOrNull(f.sottoclasse);
    if (!subN) return;
    const sub = await prisma.sottoclasse.upsert({
      where: { nome_classeId: { nome: subN, classeId: cls.id } },
      update: {},
      create: { nome: subN, classeId: cls.id },
    });

    if (!f.gruppoOmogeneo) return;
    const goN = trimOrNull(f.gruppoOmogeneo);
    if (!goN) return;
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
