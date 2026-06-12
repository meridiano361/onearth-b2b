/**
 * Moda PE27 — Esposizione config.
 * Defines color palettes, zone structure and category-to-zone mapping.
 * Replace mock palettes with real season data when available.
 */

export type ColorSwatch = { hex: string; label: string };

export type OutfitZona = 'centro' | 'destra';

/** Zone definitions for the 3-column wall-outfit layout. */
export const ZONA_CONFIG: Record<OutfitZona, { label: string; sublabel: string; categoryHint: string }> = {
  centro: {
    label: 'Capi principali',
    sublabel: 'Abiti · Top · Bottom · Interi',
    categoryHint: 'abiti, tute, top, gonne, pantaloni',
  },
  destra: {
    label: 'Accessori coordinati',
    sublabel: 'Pelletteria · Gioielli · Stole',
    categoryHint: 'borse, portafogli, stole, collane, orecchini, bracciali, anelli',
  },
};

/** Category/family keywords mapped to zone for auto-suggestion. */
export const CATEGORY_TO_ZONA: { keywords: string[]; zona: OutfitZona }[] = [
  { keywords: ['abito', 'dress', 'tuta', 'tutina', 'jumpsuit', 'top', 'gonna', 'skirt', 'pantalone', 'trouser', 'pantaloni', 'blusa', 'camicia'], zona: 'centro' },
  { keywords: ['borsa', 'bag', 'pelletteria', 'portafoglio', 'wallet', 'stola', 'sciarpa', 'scarf', 'collana', 'necklace', 'orecchino', 'earring', 'bracciale', 'bracelet', 'anello', 'ring', 'gioiell', 'jewel', 'accessori'], zona: 'destra' },
];

export function suggestZona(product: { famiglia?: string | null; sottofamiglia?: string | null; classe?: string | null; name: string }): OutfitZona {
  const haystack = [product.famiglia, product.sottofamiglia, product.classe, product.name]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  for (const { keywords, zona } of CATEGORY_TO_ZONA) {
    if (keywords.some((k) => haystack.includes(k))) return zona;
  }
  return 'centro';
}

/** Predefined color palettes for PE27 season — mock, replace with real palette. */
export const PE27_COLOR_PALETTES: { nome: string; swatches: ColorSwatch[] }[] = [
  {
    nome: 'Natura & Terra',
    swatches: [
      { hex: '#F5F0E8', label: 'Ecru' },
      { hex: '#D4B896', label: 'Sabbia' },
      { hex: '#C17A5A', label: 'Terracotta' },
      { hex: '#8B6914', label: 'Ocra' },
      { hex: '#4A3728', label: 'Cioccolato' },
    ],
  },
  {
    nome: 'Verde & Fresco',
    swatches: [
      { hex: '#E8F0E8', label: 'Bianco Verde' },
      { hex: '#8FAF8F', label: 'Salvia' },
      { hex: '#5A8A6A', label: 'Muschio' },
      { hex: '#2D5A3D', label: 'Foresta' },
      { hex: '#D4E8D4', label: 'Menta' },
    ],
  },
  {
    nome: 'Blu & Notte',
    swatches: [
      { hex: '#E8EEF5', label: 'Ghiaccio' },
      { hex: '#93B4D4', label: 'Cielo' },
      { hex: '#4A7AAF', label: 'Azzurro' },
      { hex: '#1E3A5F', label: 'Blu Notte' },
      { hex: '#0D1B2A', label: 'Notte' },
    ],
  },
  {
    nome: 'Rosa & Cipria',
    swatches: [
      { hex: '#FFF0F0', label: 'Bianco Rosa' },
      { hex: '#F9D0C4', label: 'Cipria' },
      { hex: '#E8A0A0', label: 'Rosa Antico' },
      { hex: '#C46B8A', label: 'Malva' },
      { hex: '#8A2D5A', label: 'Prugna' },
    ],
  },
  {
    nome: 'Neutri Eleganti',
    swatches: [
      { hex: '#FFFFFF', label: 'Bianco' },
      { hex: '#E8E4DC', label: 'Avorio' },
      { hex: '#C8C0B4', label: 'Greige' },
      { hex: '#7A7468', label: 'Talpa' },
      { hex: '#1A1A18', label: 'Nero' },
    ],
  },
];

/** Texture/fantasia options for the left column. */
export const FANTASIA_OPTIONS = [
  'Tinta unita',
  'Fantasia geometrica',
  'Floreale',
  'Righe',
  'Pois',
  'Astratto',
  'Jacquard',
  'Misto lino',
  'Cotone grezzo',
  'Seta opaca',
  'Velluto',
  'Pizzo',
  'Knit / Maglia',
];
