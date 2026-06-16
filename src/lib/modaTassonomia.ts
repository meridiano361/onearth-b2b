/**
 * Albero merceologico per la collezione Moda PE27.
 * Struttura: gruppoMerceologico → famiglia → classe → sottoclasse → gruppoOmogeneo[]
 *
 * Formato: sentence case (iniziale maiuscola, resto minuscolo).
 */

export const MODA_GRUPPO_MERCEOLOGICO = 'Moda' as const;

export type ModaFamiglia = 'Abbigliamento' | 'Accessori persona' | 'Bigiotteria e gioielleria';

/** Full hierarchy: famiglia → classe → sottoclasse → gruppoOmogeneo[] */
export const MODA_TASSONOMIA: Record<ModaFamiglia, Record<string, Record<string, string[]>>> = {
  Abbigliamento: {
    Donna: {
      Abiti:              ['Casual', 'Eleganti', 'Prendisole'],
      'Bermuda e shorts': ['Casual', 'Eleganti'],
      Camicie:            ['Manica 3-4', 'Manica corta', 'Manica lunga'],
      Capispalla:         ['Casual', 'Eleganti'],
      Cardigans:          ['Casual', 'Eleganti'],
      Gilet:              ['Gilet'],
      Gonne:              ['Casual', 'Eleganti'],
      Jeans:              ['Jeans'],
      Kurta:              ['Manica 3-4', 'Manica corta', 'Manica lunga'],
      Maglie:             ['Casual', 'Eleganti'],
      Pantaloni:          ['Casual', 'Eleganti'],
      'Ponchos donna':    ['Ponchos donna'],
      Tees:               ['Lupetto', 'Manica 3-4', 'Manica corta', 'Manica lunga'],
      'Top e canotte':    ['Top e canotte'],
    },
    'Tempo libero': {},
    Uomo: {},
  },

  'Accessori persona': {
    Donna: {
      'Accessori borsetta':   ['Bustine e pochette', 'Portafogli', 'Specchietti', 'Ventagli'],
      'Accessori personali':  ['Bandannas e fasce capelli', 'Cappelli', 'Cinture', 'Guanti', 'Sciarpe', 'Sciarpine', 'Stole e foulard'],
      'Altri accessori':      ['Beauty'],
      Borse:                  ['Borsine da festa', 'In fibra', 'In pelle', 'In tessuto', 'Sacche', 'Shopper', 'Zaini'],
      'Fermacapelli e spille': ['Fermacapelli ed elastici', 'Spille'],
      Parei:                  ['Parei'],
      'Scaldaspalle e colli': ['Colli', 'Scaldaspalle'],
    },
    Unisex: {
      'Altri accessori': ['Accessori vari', 'Beauty', 'Porta cellulare', 'Porta macchina digitale', 'Porta occhiali', 'Portachiavi', 'Portamonete'],
      Borse:             ['Borsa porta computer', 'Borse da ufficio', 'Borse e accessori per il trasporto', 'Borse in materiali di riciclo', 'Borsine portadocumenti', 'Marsupi', 'Zaini'],
    },
    Uomo: {
      'Accessori personali': ['Bandannas', 'Cappelli', 'Cinture', 'Cravatte', 'Guanti', 'Sciarpe', 'Sciarpine'],
      'Altri accessori':     ['Portafogli'],
      Borse:                 ['Borselli', 'In pelle', 'In tessuto'],
    },
  },

  'Bigiotteria e gioielleria': {
    Donna: {
      Anelli:              ['Bigiotteria', 'Materiali preziosi'],
      Bracciali:           ['Bigiotteria', 'Materiali preziosi'],
      Cavigliere:          ['Cavigliere donna'],
      'Collane e pendenti': ['Bigiotteria', 'Materiali preziosi'],
      Orecchini:           ['Bigiotteria', 'Materiali preziosi'],
      Parure:              ['Bigiotteria', 'Materiali preziosi'],
      Piercing:            ['Piercing'],
    },
    Uomo: {
      Anelli:              [],
      Bracciali:           [],
      'Collane e pendenti': [],
      Orecchini:           [],
    },
  },
};

/** All valid famiglia values */
export const MODA_FAMIGLIE = Object.keys(MODA_TASSONOMIA) as ModaFamiglia[];

/** Valid classi for a given famiglia */
export function getModaClassi(famiglia: string): string[] {
  const f = MODA_TASSONOMIA[famiglia as ModaFamiglia];
  return f ? Object.keys(f) : [];
}

/** Valid sottoclassi for a given famiglia + classe */
export function getModaSottoclassi(famiglia: string, classe: string): string[] {
  const f = MODA_TASSONOMIA[famiglia as ModaFamiglia];
  if (!f) return [];
  return Object.keys(f[classe] ?? {});
}

/** Valid gruppi omogenei for a given famiglia + classe + sottoclasse */
export function getModaGruppiOmogenei(famiglia: string, classe: string, sottoclasse: string): string[] {
  const f = MODA_TASSONOMIA[famiglia as ModaFamiglia];
  if (!f) return [];
  return f[classe]?.[sottoclasse] ?? [];
}
