/**
 * Moda PE27 — access control constants and pure helper.
 * This file is Edge Runtime safe (imported by middleware).
 * Server-only helpers (requireModaSession) live in modaServer.ts.
 */

import { isAdminRole } from '@/lib/roles';

export const MODA_COLLEZIONE = 'PE27';
export const MODA_BRANCH_ID = 'modaPE27' as const;
export const CASA_BRANCH_ID = 'casa27' as const;

export type CatalogBranchId = typeof MODA_BRANCH_ID | typeof CASA_BRANCH_ID;

/** Returns true only for admin roles (SUPER_ADMIN, ADMIN, COMMERCIALE, MAGAZZINO). */
export function canAccessModa(role: string | null | undefined): boolean {
  return isAdminRole(role);
}
