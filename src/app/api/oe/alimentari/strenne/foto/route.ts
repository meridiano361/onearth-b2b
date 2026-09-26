import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isMeridiano361Org } from '@/lib/modaServer';
import { prisma } from '@/lib/prisma';

async function requireM361() {
  const session = await getServerSession(authOptions);
  if (!session) return null;
  const ok = await isMeridiano361Org(session.user.role, session.user.organizationId);
  return ok ? session : null;
}

export async function GET() {
  if (!await requireM361()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const rows = await prisma.oeStrennaFoto.findMany();
  const result: Record<string, { fotoUrl: string; nome: string; cestoCodice: string }> = {};
  for (const r of rows) result[r.barcode] = { fotoUrl: r.fotoUrl, nome: r.nome, cestoCodice: r.cestoCodice };
  return NextResponse.json(result);
}
