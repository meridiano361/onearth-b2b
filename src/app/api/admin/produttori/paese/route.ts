import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { prisma } from '@/lib/prisma';

// GET /api/admin/produttori/paese?nome=NomeProduttore
// Returns the paese associated with a produttore, or null if not found.
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const nome = req.nextUrl.searchParams.get('nome')?.trim();
  if (!nome) return NextResponse.json({ paese: null });

  const produttore = await prisma.produttore.findUnique({
    where: { nome },
    select: { paese: true },
  });

  return NextResponse.json({ paese: produttore?.paese ?? null });
}
