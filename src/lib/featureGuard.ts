import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { prisma } from '@/lib/prisma';

/**
 * Verifica che l'utente loggato sia un OPERATOR attivo o un admin.
 * Restituisce il userId se autorizzato, null altrimenti.
 */
export async function requireMondiEspositivi(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  if (isAdminRole(session.user.role)) return session.user.id;

  if (session.user.role !== 'OPERATOR') return null;

  const op = await prisma.operator.findUnique({
    where: { id: session.user.id },
    select: { attivo: true },
  });

  if (!op?.attivo) return null;
  return session.user.id;
}
