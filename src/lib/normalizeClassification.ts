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

// Taxonomy fields: first letter uppercase, rest lowercase
const PRODUCT_CAPFIRST_FIELDS = [
  'famiglia', 'classe', 'sottoclasse', 'sottoclasse2',
  'gruppoOmogeneo', 'gruppoOmogeneo2',
] as const;

// Other classification fields: trim only
const PRODUCT_TRIM_FIELDS = [
  'gruppoMerceologico',
  'colore', 'temaColore', 'stagione', 'tranche',
  'produttore', 'misura', 'paese', 'fasciaRicarico', 'notes',
] as const;

export function normalizeProductClassificationFields<T extends Record<string, any>>(data: T): T {
  const result = { ...data } as any;
  for (const field of PRODUCT_UPPER_FIELDS) {
    if (result[field]) result[field] = (result[field] as string).trim().toUpperCase() || null;
  }
  for (const field of PRODUCT_CAPFIRST_FIELDS) {
    if (result[field]) {
      const t = (result[field] as string).trim();
      result[field] = t ? t.charAt(0).toUpperCase() + t.slice(1).toLowerCase() : null;
    }
  }
  for (const field of PRODUCT_TRIM_FIELDS) {
    if (result[field] !== undefined && result[field] !== null) {
      result[field] = (result[field] as string).trim() || null;
    }
  }
  // Normalize gruppoMerceologico: "moda", "MODA", etc. → always "Moda"
  if (result.gruppoMerceologico?.toLowerCase() === 'moda') {
    result.gruppoMerceologico = 'Moda';
  }
  return result as T;
}

/** Applies the "HUBEQ" prefix to equomercato product codes. Idempotent. */
export function ensureHubeqCode(code: string, conferente?: string | null): string {
  if (conferente?.trim() === 'Equomercato' && !code.startsWith('HUBEQ')) {
    return 'HUBEQ' + code;
  }
  return code;
}

/**
 * Normalizes an Equomercato product name:
 * first letter uppercase + rest lowercase, except nomLinea which stays ALL CAPS.
 * Idempotent and safe to call on any casing.
 */
export function normalizeEquomercatoName(name: string, nomLinea?: string | null): string {
  const t = name.trim();
  if (!t) return t;
  // lowercase everything, then capitalize first char
  let n = t.toLowerCase();
  n = n.charAt(0).toUpperCase() + n.slice(1);
  // restore nomLinea as ALL CAPS wherever it appears
  if (nomLinea?.trim()) {
    const linea = nomLinea.trim();
    const escaped = linea.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    n = n.replace(new RegExp(escaped, 'g'), linea.toUpperCase());
  }
  return n;
}
