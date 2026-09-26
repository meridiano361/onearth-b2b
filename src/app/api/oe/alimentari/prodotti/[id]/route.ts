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

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!await requireM361()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.nome !== undefined)           data.nome = body.nome;
  if (body.codice !== undefined)         data.codice = body.codice || null;
  if (body.barcode !== undefined)        data.barcode = body.barcode || null;
  if (body.fornitore !== undefined)      data.fornitore = body.fornitore || null;
  if (body.formato !== undefined)        data.formato = body.formato || null;
  if (body.ivaPerc !== undefined)        data.ivaPerc = Number(body.ivaPerc);
  if (body.costoIi !== undefined)        data.costoIi = Number(body.costoIi);
  if (body.pvpIi !== undefined)          data.pvpIi = Number(body.pvpIi);
  if (body.pvpConsigliato !== undefined) data.pvpConsigliato = body.pvpConsigliato ? Number(body.pvpConsigliato) : null;
  if (body.fotoUrl !== undefined)          data.fotoUrl = body.fotoUrl || null;
  if (body.note !== undefined)             data.note = body.note || null;
  if (body.prezziConfermati !== undefined) data.prezziConfermati = Boolean(body.prezziConfermati);

  try {
    const p = await prisma.oeAlimentariProdotto.update({
      where: { id: params.id },
      data,
      include: { fabbisognoEmpori: true, ordinato: true },
    });
    return NextResponse.json(p);
  } catch {
    return NextResponse.json({ error: 'Non trovato' }, { status: 404 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!await requireM361()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    await prisma.oeAlimentariProdotto.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Non trovato' }, { status: 404 });
  }
}
