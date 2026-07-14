/**
 * Moda PE27 — server-only auth guard.
 * NOT safe for Edge Runtime. Import only from API routes and server components.
 */

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { canAccessModa } from '@/lib/modaAccess';
import { prisma } from '@/lib/prisma';
import type { Session } from 'next-auth';

/**
 * Guard for API routes: returns the session if the caller is authorized for Moda PE27,
 * null otherwise (caller should return 403).
 */
export async function requireModaSession(): Promise<Session | null> {
  const session = await getServerSession(authOptions);
  if (!session || !canAccessModa(session.user?.role, session.user?.email)) return null;
  return session;
}

/**
 * Returns true when the user's organization is Meridiano361.
 * Admins always return true. Customers always return false.
 * Operators: checked via DB lookup on their organizationId.
 */
export async function isMeridiano361Org(
  role: string | null | undefined,
  organizationId: string | null | undefined,
): Promise<boolean> {
  if (!role) return false;
  if (['SUPER_ADMIN', 'ADMIN', 'COMMERCIALE', 'MAGAZZINO'].includes(role)) return true;
  if (!organizationId) return false;
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { nome: true },
  });
  return !!org?.nome?.toLowerCase().replace(/[\s_-]/g, '').includes('meridiano361');
}
