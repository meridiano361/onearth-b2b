import { NextRequest, NextResponse } from 'next/server';
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

export async function PUT(req: NextRequest, { params }: { params: { barcode: string } }) {
  if (!await requireM361()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { barcode } = params;
  const body = await req.json();
  const prodotti: string[] = Array.isArray(body.prodotti) ? body.prodotti : [];

  await prisma.oeStrennaProdotto.deleteMany({ where: { strennaBarcode: barcode } });
  if (prodotti.length > 0) {
    await prisma.oeStrennaProdotto.createMany({
      data: prodotti.map((nome, i) => ({ strennaBarcode: barcode, prodottoNome: nome, ordine: i })),
    });
  }
  return NextResponse.json({ prodotti });
}
