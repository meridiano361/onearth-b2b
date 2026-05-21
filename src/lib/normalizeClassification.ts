export function capFirst(s: string): string {
  const t = s.trim();
  return t ? t.charAt(0).toUpperCase() + t.slice(1).toLowerCase() : t;
}

export function upperAll(s: string): string {
  return s.trim().toUpperCase();
}

export function titleCase(s: string): string {
  return s.trim().toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

// Lookup entities normalized to UPPERCASE
const UPPER_ENTITIES = new Set(['linea', 'nomLinea']);

// Lookup entities normalized to Title Case
const TITLE_ENTITIES = new Set(['produttore']);

// Lookup entities normalized to capFirst
const CAP_ENTITIES = new Set([
  'stagione', 'collezione', 'colore', 'temaColore', 'tranche',
  'gruppoMerceologico', 'famiglia', 'classe', 'sottoclasse', 'gruppoOmogeneo',
]);

export function normalizeLookupValue(entita: string, nome: string): string {
  const t = nome.trim();
  if (!t) return t;
  if (UPPER_ENTITIES.has(entita)) return t.toUpperCase();
  if (TITLE_ENTITIES.has(entita)) return titleCase(t);
  if (CAP_ENTITIES.has(entita)) return capFirst(t);
  return t;
}

// Product model classification fields that are UPPERCASE
const PRODUCT_UPPER_FIELDS = ['nomLinea'] as const;

// Product model classification fields that are Title Case
const PRODUCT_TITLE_FIELDS = ['produttore'] as const;

// Product model classification fields that are capFirst
const PRODUCT_CAP_FIELDS = [
  'gruppoMerceologico', 'famiglia', 'classe', 'sottoclasse', 'gruppoOmogeneo',
  'collezione', 'colore', 'temaColore', 'stagione', 'tranche',
] as const;

export function normalizeProductClassificationFields<T extends Record<string, any>>(data: T): T {
  const result = { ...data } as any;
  for (const field of PRODUCT_UPPER_FIELDS) {
    if (result[field]) result[field] = (result[field] as string).trim().toUpperCase() || null;
  }
  for (const field of PRODUCT_TITLE_FIELDS) {
    if (result[field]) result[field] = titleCase(result[field] as string) || null;
  }
  for (const field of PRODUCT_CAP_FIELDS) {
    if (result[field]) result[field] = capFirst(result[field] as string) || null;
  }
  return result as T;
}
