import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * Verifica che l'utente loggato sia un OPERATOR attivo.
 * Restituisce l'operatorId se autorizzato, null altrimenti.
 */
export async function requireMondiEspositivi(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'OPERATOR') return null;

  const op = await prisma.operator.findUnique({
    where: { id: session.user.id },
    select: { attivo: true },
  });

  if (!op?.attivo) return null;
  return session.user.id;
}
