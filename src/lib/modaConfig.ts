/**
 * Moda PE27 — taxonomy, filters and product field config.
 * Centralizes all domain knowledge specific to the moda branch.
 * Replace with DB-driven config when the data model grows.
 */

export type ModaCategoryGroup = {
  id: string;
  label: string;
  categories: ModaCategory[];
};

export type ModaCategory = {
  id: string;
  label: string;
  group: string;
};

export const MODA_CATEGORY_GROUPS: ModaCategoryGroup[] = [
  {
    id: 'abbigliamento',
    label: 'Abbigliamento',
    categories: [
      { id: 'abiti',     label: 'Abiti',     group: 'abbigliamento' },
      { id: 'top',       label: 'Top',       group: 'abbigliamento' },
      { id: 'pantaloni', label: 'Pantaloni', group: 'abbigliamento' },
      { id: 'gonne',     label: 'Gonne',     group: 'abbigliamento' },
    ],
  },
  {
    id: 'accessori',
    label: 'Accessori',
    categories: [
      { id: 'borse',        label: 'Borse',        group: 'accessori' },
      { id: 'portafogli',   label: 'Portafogli',   group: 'accessori' },
      { id: 'stole',        label: 'Stole',        group: 'accessori' },
      { id: 'accessori',    label: 'Accessori',    group: 'accessori' },
    ],
  },
  {
    id: 'gioielli',
    label: 'Gioielleria',
    categories: [
      { id: 'collane',    label: 'Collane',    group: 'gioielli' },
      { id: 'orecchini',  label: 'Orecchini',  group: 'gioielli' },
      { id: 'bracciali',  label: 'Bracciali',  group: 'gioielli' },
      { id: 'anelli',     label: 'Anelli',     group: 'gioielli' },
    ],
  },
];

export const MODA_CATEGORIES: ModaCategory[] = MODA_CATEGORY_GROUPS.flatMap((g) => g.categories);

/** Look product tipos — determines which section a product appears in within a look view. */
export type LookProductTipo =
  | 'look_item'     // main outfit piece
  | 'completa_look' // completes the look
  | 'accessorio'    // coordinated accessory
  | 'gioiello';     // jewelry pairing

export const LOOK_TIPO_LABELS: Record<LookProductTipo, string> = {
  look_item:     'Look',
  completa_look: 'Completa il look',
  accessorio:    'Accessori coordinati',
  gioiello:      'Gioielli abbinati',
};

export const LOOK_TIPO_OPTIONS: { value: LookProductTipo; label: string }[] = [
  { value: 'look_item',     label: 'Pezzo del look' },
  { value: 'completa_look', label: 'Completa il look' },
  { value: 'accessorio',    label: 'Accessorio coordinato' },
  { value: 'gioiello',      label: 'Gioiello abbinato' },
];

/** Sort options for the moda catalog. */
export const MODA_SORT_OPTIONS = [
  { value: 'name_asc',   label: 'Nome A→Z' },
  { value: 'name_desc',  label: 'Nome Z→A' },
  { value: 'price_asc',  label: 'Prezzo crescente' },
  { value: 'price_desc', label: 'Prezzo decrescente' },
] as const;

export type ModaSortOption = typeof MODA_SORT_OPTIONS[number]['value'];

/** Product card field visibility for the moda branch. */
export const MODA_CARD_FIELDS = {
  showCode: true,
  showFamily: false,
  showColor: true,
  showCostPrice: true,
  showRetailPrice: false,
  showLotSize: false,
} as const;
