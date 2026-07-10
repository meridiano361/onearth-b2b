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

// Email allowlist for non-admin access during testing
const MODA_ALLOWED_EMAILS = new Set(['cremona@meridiano361.it']);

/** Returns true for admin roles or emails in the testing allowlist. */
export function canAccessModa(role: string | null | undefined, email?: string | null): boolean {
  if (isAdminRole(role)) return true;
  return !!email && MODA_ALLOWED_EMAILS.has(email);
}
