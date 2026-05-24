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
const UPPER_ENTITIES = new Set(['linea', 'nomLinea', 'collezione']);

export function normalizeLookupValue(entita: string, nome: string): string {
  const t = nome.trim();
  if (!t) return t;
  if (UPPER_ENTITIES.has(entita)) return t.toUpperCase();
  // All other entities: preserve the admin's exact casing (only trim)
  return t;
}

// Product model fields normalized to UPPERCASE (catalog codes)
const PRODUCT_UPPER_FIELDS = ['nomLinea', 'collezione'] as const;

// All other classification fields: save exactly as typed by the admin (only trim).
// capFirst was removed because it silently converts "AI"→"Ai", "PE"→"Pe",
// "CA27"→"Ca27", making case-only edits impossible to save.
const PRODUCT_TRIM_FIELDS = [
  'gruppoMerceologico', 'famiglia', 'classe', 'sottoclasse', 'gruppoOmogeneo',
  'colore', 'temaColore', 'stagione', 'tranche',
  'produttore', 'misura', 'paese', 'fasciaRicarico', 'notes',
] as const;

export function normalizeProductClassificationFields<T extends Record<string, any>>(data: T): T {
  const result = { ...data } as any;
  for (const field of PRODUCT_UPPER_FIELDS) {
    if (result[field]) result[field] = (result[field] as string).trim().toUpperCase() || null;
  }
  for (const field of PRODUCT_TRIM_FIELDS) {
    if (result[field] !== undefined && result[field] !== null) {
      result[field] = (result[field] as string).trim() || null;
    }
  }
  return result as T;
}
