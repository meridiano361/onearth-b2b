/**
 * Moda PE27 — access control constants and pure helper.
 * This file is Edge Runtime safe (imported by middleware).
 * Server-only helpers (requireModaSession) live in modaServer.ts.
 */

export const MODA_EMAIL = 'e.mazzolari@meridiano361.it';
export const MODA_COLLEZIONE = 'PE27';
export const MODA_BRANCH_ID = 'modaPE27' as const;
export const CASA_BRANCH_ID = 'casa27' as const;

export type CatalogBranchId = typeof MODA_BRANCH_ID | typeof CASA_BRANCH_ID;

/** Returns true only for the single account that can access Moda PE27. */
export function canAccessModa(email: string | null | undefined): boolean {
  return !!email && email.toLowerCase().trim() === MODA_EMAIL;
}
