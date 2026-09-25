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

export async function GET() {
  if (!await requireM361()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const prodotti = await prisma.oeAlimentariProdotto.findMany({
    include: { fabbisognoEmpori: true, ordinato: true },
    orderBy: { ordine: 'asc' },
  });
  return NextResponse.json(prodotti);
}

export async function POST(req: NextRequest) {
  if (!await requireM361()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  if (!body.nome?.trim()) return NextResponse.json({ error: 'Nome obbligatorio' }, { status: 400 });

  const prodotto = await prisma.oeAlimentariProdotto.create({
    data: {
      nome: body.nome.trim(),
      codice: body.codice?.trim() || null,
      barcode: body.barcode?.trim() || null,
      fornitore: body.fornitore?.trim() || null,
      formato: body.formato?.trim() || null,
      ivaPerc: body.ivaPerc ? Number(body.ivaPerc) : 10,
      costoIi: body.costoIi ? Number(body.costoIi) : 0,
      pvpIi: body.pvpIi ? Number(body.pvpIi) : 0,
      pvpConsigliato: body.pvpConsigliato ? Number(body.pvpConsigliato) : null,
      note: body.note?.trim() || null,
      ordine: body.ordine ? Number(body.ordine) : 99,
    },
    include: { fabbisognoEmpori: true, ordinato: true },
  });
  return NextResponse.json(prodotto, { status: 201 });
}
