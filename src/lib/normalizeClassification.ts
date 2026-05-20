export function capFirst(s: string): string {
  const t = s.trim();
  return t ? t.charAt(0).toUpperCase() + t.slice(1).toLowerCase() : t;
}

export function upperAll(s: string): string {
  return s.trim().toUpperCase();
}

// Lookup entities normalized to UPPERCASE
const UPPER_ENTITIES = new Set(['linea', 'nomLinea']);

// Lookup entities normalized to capFirst
const CAP_ENTITIES = new Set([
  'stagione', 'collezione', 'colore', 'temaColore', 'produttore', 'tranche',
  'gruppoMerceologico', 'famiglia', 'classe', 'sottoclasse', 'gruppoOmogeneo',
]);

export function normalizeLookupValue(entita: string, nome: string): string {
  const t = nome.trim();
  if (!t) return t;
  if (UPPER_ENTITIES.has(entita)) return t.toUpperCase();
  if (CAP_ENTITIES.has(entita)) return capFirst(t);
  return t;
}

// Product model classification fields that are UPPERCASE
const PRODUCT_UPPER_FIELDS = ['nomLinea'] as const;

// Product model classification fields that are capFirst
const PRODUCT_CAP_FIELDS = [
  'gruppoMerceologico', 'famiglia', 'classe', 'sottoclasse', 'gruppoOmogeneo',
  'collezione', 'colore', 'temaColore', 'stagione', 'produttore', 'tranche',
] as const;

export function normalizeProductClassificationFields<T extends Record<string, any>>(data: T): T {
  const result = { ...data } as any;
  for (const field of PRODUCT_UPPER_FIELDS) {
    if (result[field]) result[field] = (result[field] as string).trim().toUpperCase() || null;
  }
  for (const field of PRODUCT_CAP_FIELDS) {
    if (result[field]) result[field] = capFirst(result[field] as string) || null;
  }
  return result as T;
}
