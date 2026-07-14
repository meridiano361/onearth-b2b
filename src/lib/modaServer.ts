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

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN', 'COMMERCIALE', 'MAGAZZINO'];

async function getOrgName(organizationId: string | null | undefined): Promise<string> {
  if (!organizationId) return '';
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { nome: true },
  });
  return org?.nome?.toLowerCase().replace(/[\s_-]/g, '') ?? '';
}

/** Returns true when the user's organization is Meridiano361. Admins always return true. */
export async function isMeridiano361Org(
  role: string | null | undefined,
  organizationId: string | null | undefined,
): Promise<boolean> {
  if (!role) return false;
  if (ADMIN_ROLES.includes(role)) return true;
  return (await getOrgName(organizationId)).includes('meridiano361');
}

/**
 * Returns true when the user can access Abbigliamento + Accessori persona families.
 * Granted to: admins, Meridiano361 org, La Bottega Solidale org.
 */
export async function canAccessFullModa(
  role: string | null | undefined,
  organizationId: string | null | undefined,
): Promise<boolean> {
  if (!role) return false;
  if (ADMIN_ROLES.includes(role)) return true;
  const name = await getOrgName(organizationId);
  return name.includes('meridiano361') || name.includes('bottegasolidale');
}

/**
 * Returns true when the user can access the Visual/Pareti section.
 * Granted to: admins, Meridiano361 org, La Bottega Solidale org.
 */
export async function canAccessVisual(
  role: string | null | undefined,
  organizationId: string | null | undefined,
): Promise<boolean> {
  return canAccessFullModa(role, organizationId);
}
