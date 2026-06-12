/**
 * Moda PE27 — server-only auth guard.
 * NOT safe for Edge Runtime. Import only from API routes and server components.
 */

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { canAccessModa } from '@/lib/modaAccess';
import type { Session } from 'next-auth';

/**
 * Guard for API routes: returns the session if the caller is authorized for Moda PE27,
 * null otherwise (caller should return 403).
 */
export async function requireModaSession(): Promise<Session | null> {
  const session = await getServerSession(authOptions);
  if (!session || !canAccessModa(session.user?.email)) return null;
  return session;
}
