/**
 * Albero merceologico per la collezione Moda PE27.
 * Struttura: gruppoMerceologico → famiglia → classe → sottoclasse → gruppoOmogeneo[]
 *
 * Regole:
 * - Solo MODA come gruppo merceologico
 * - Nessuna voce BIMBO / BIMBA / INTIMO / SCARPE
 * - Tutto maiuscolo
 * - Classificare nel nodo più specifico disponibile
 */

export const MODA_GRUPPO_MERCEOLOGICO = 'MODA' as const;

export type ModaFamiglia = 'ABBIGLIAMENTO' | 'ACCESSORI PERSONA' | 'BIGIOTTERIA E GIOIELLERIA';

/** Full hierarchy: famiglia → classe → sottoclasse → gruppoOmogeneo[] */
export const MODA_TASSONOMIA: Record<ModaFamiglia, Record<string, Record<string, string[]>>> = {
  ABBIGLIAMENTO: {
    DONNA: {
      ABITI:            ['CASUAL', 'ELEGANTI', 'PRENDISOLE'],
      'BERMUDA E SHORTS': ['CASUAL', 'ELEGANTI'],
      CAMICIE:          ['MANICA 3-4', 'MANICA CORTA', 'MANICA LUNGA'],
      CAPISPALLA:       ['CASUAL', 'ELEGANTI'],
      CARDIGANS:        ['CASUAL', 'ELEGANTI'],
      GILET:            ['GILET'],
      GONNE:            ['CASUAL', 'ELEGANTI'],
      JEANS:            ['JEANS'],
      KURTA:            ['MANICA 3-4', 'MANICA CORTA', 'MANICA LUNGA'],
      MAGLIE:           ['CASUAL', 'ELEGANTI'],
      PANTALONI:        ['CASUAL', 'ELEGANTI'],
      'PONCHOS DONNA':  ['PONCHOS DONNA'],
      TEES:             ['LUPETTO', 'MANICA 3-4', 'MANICA CORTA', 'MANICA LUNGA'],
      'TOP E CANOTTE':  ['TOP E CANOTTE'],
    },
    'TEMPO LIBERO': {},
    UOMO: {},
  },

  'ACCESSORI PERSONA': {
    DONNA: {
      'ACCESSORI BORSETTA':   ['BUSTINE E POCHETTE', 'PORTAFOGLI', 'SPECCHIETTI', 'VENTAGLI'],
      'ACCESSORI PERSONALI':  ['BANDANNAS E FASCE CAPELLI', 'CAPPELLI', 'CINTURE', 'GUANTI', 'SCIARPE', 'SCIARPINE', 'STOLE E FOULARD'],
      'ALTRI ACCESSORI':      ['BEAUTY'],
      BORSE:                  ['BORSINE DA FESTA', 'IN FIBRA', 'IN PELLE', 'IN TESSUTO', 'SACCHE', 'SHOPPER', 'ZAINI'],
      'FERMACAPELLI E SPILLE': ['FERMACAPELLI ED ELASTICI', 'SPILLE'],
      PAREI:                  ['PAREI'],
      'SCALDASPALLE E COLLI': ['COLLI', 'SCALDASPALLE'],
    },
    UNISEX: {
      'ALTRI ACCESSORI': ['ACCESSORI VARI', 'BEAUTY', 'PORTA CELLULARE', 'PORTA MACCHINA DIGITALE', 'PORTA OCCHIALI', 'PORTACHIAVI', 'PORTAMONETE'],
      BORSE:             ['BORSA PORTA COMPUTER', 'BORSE DA UFFICIO', 'BORSE E ACCESSORI PER IL TRASPORTO', 'BORSE IN MATERIALI DI RICICLO', 'BORSINE PORTADOCUMENTI', 'MARSUPI', 'ZAINI'],
    },
    UOMO: {
      'ACCESSORI PERSONALI': ['BANDANNAS', 'CAPPELLI', 'CINTURE', 'CRAVATTE', 'GUANTI', 'SCIARPE', 'SCIARPINE'],
      'ALTRI ACCESSORI':     ['PORTAFOGLI'],
      BORSE:                 ['BORSELLI', 'IN PELLE', 'IN TESSUTO'],
    },
  },

  'BIGIOTTERIA E GIOIELLERIA': {
    DONNA: {
      ANELLI:              ['BIGIOTTERIA', 'MATERIALI PREZIOSI'],
      BRACCIALI:           ['BIGIOTTERIA', 'MATERIALI PREZIOSI'],
      CAVIGLIERE:          ['CAVIGLIERE DONNA'],
      'COLLANE E PENDENTI': ['BIGIOTTERIA', 'MATERIALI PREZIOSI'],
      ORECCHINI:           ['BIGIOTTERIA', 'MATERIALI PREZIOSI'],
      PARURE:              ['BIGIOTTERIA', 'MATERIALI PREZIOSI'],
      PIERCING:            ['PIERCING'],
    },
    UOMO: {
      ANELLI:              [],
      BRACCIALI:           [],
      'COLLANE E PENDENTI': [],
      ORECCHINI:           [],
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
