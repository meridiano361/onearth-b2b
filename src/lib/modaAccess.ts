/**
 * Moda PE27 — access control constants and pure helper.
 * This file is Edge Runtime safe (imported by middleware).
 * Server-only helpers (requireModaSession) live in modaServer.ts.
 */

import { isAdminRole } from '@/lib/roles';

export const MODA_COLLEZIONE = 'PE27';

// Famiglie MODA visibili solo agli account dell'organizzazione Meridiano361
export const RESTRICTED_MODA_FAMIGLIE = ['Abbigliamento', 'Accessori persona'] as const;
export const MODA_BRANCH_ID = 'modaPE27' as const;
export const CASA_BRANCH_ID = 'casa27' as const;

export type CatalogBranchId = typeof MODA_BRANCH_ID | typeof CASA_BRANCH_ID;

// Apertura pubblica: martedì 14 luglio 2026 ore 8:30 ora italiana (CEST = UTC+2)
const MODA_OPENS_AT = new Date('2026-07-14T08:30:00+02:00');

// Tester con accesso anticipato (solo prima dell'apertura pubblica)
const MODA_EARLY_ACCESS_EMAILS = new Set(['cremona@meridiano361.it']);

/**
 * Returns true when the user can access the Moda PE27 catalog:
 * - always: admin roles
 * - before MODA_OPENS_AT: only emails in MODA_EARLY_ACCESS_EMAILS
 * - from MODA_OPENS_AT onward: all authenticated users
 */
export function canAccessModa(role: string | null | undefined, email?: string | null): boolean {
  if (isAdminRole(role)) return true;
  if (Date.now() >= MODA_OPENS_AT.getTime()) return true;
  return !!email && MODA_EARLY_ACCESS_EMAILS.has(email);
}
