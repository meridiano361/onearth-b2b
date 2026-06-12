/**
 * Moda PE27 — access control helper.
 * Single source of truth for all auth guards (middleware, pages, API routes, components).
 */

export const MODA_EMAIL = 'e.mazzolari@meridiano361.it';
export const MODA_COLLEZIONE = 'PE27';
export const MODA_BRANCH_ID = 'modaPE27' as const;
export const CASA_BRANCH_ID = 'casa27' as const;

export type CatalogBranchId = typeof MODA_BRANCH_ID | typeof CASA_BRANCH_ID;

/** Returns true only for the single account that can access Moda PE27. */
export function canAccessModa(email: string | null | undefined): boolean {
  return email === MODA_EMAIL;
}

/**
 * Server-side guard for Next.js API routes.
 * Returns the session if authorized, null otherwise (caller must return 403).
 */
export async function requireModaSession(): Promise<import('next-auth').Session | null> {
  const { getServerSession } = await import('next-auth');
  const { authOptions } = await import('@/lib/auth');
  const session = await getServerSession(authOptions);
  if (!session || !canAccessModa(session.user?.email)) return null;
  return session;
}
