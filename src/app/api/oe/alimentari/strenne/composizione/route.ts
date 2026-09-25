import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isMeridiano361Org } from '@/lib/modaServer';

async function requireM361() {
  const session = await getServerSession(authOptions);
  if (!session) return null;
  const ok = await isMeridiano361Org(session.user.role, session.user.organizationId);
  return ok ? session : null;
}

export async function GET() {
  if (!await requireM361()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const rows = await prisma.oeStrennaProdotto.findMany({ orderBy: { ordine: 'asc' } });
  const result: Record<string, string[]> = {};
  for (const r of rows) {
    if (!result[r.strennaBarcode]) result[r.strennaBarcode] = [];
    result[r.strennaBarcode].push(r.prodottoNome);
  }
  return NextResponse.json(result);
}
