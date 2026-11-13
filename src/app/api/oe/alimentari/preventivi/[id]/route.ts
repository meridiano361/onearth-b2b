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

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!await requireM361()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const p = await prisma.oePreventivo.findUnique({ where: { id: params.id } });
  if (!p) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(p);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  if (!await requireM361()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();

  const p = await prisma.oePreventivo.update({
    where: { id: params.id },
    data: {
      tipoOrdine: body.tipoOrdine,
      sottotipoNatale: body.sottotipoNatale ?? null,
      emporio: body.emporio,
      canale: body.canale ?? null,
      operatore: body.operatore ?? null,
      dataPreventivo: body.dataPreventivo ? new Date(body.dataPreventivo) : undefined,
      clienteNome: body.clienteNome,
      clienteCognome: body.clienteCognome ?? null,
      clienteCellulare: body.clienteCellulare ?? null,
      clienteEmail: body.clienteEmail ?? null,
      waAttivo: body.waAttivo,
      clienteExtra: body.clienteExtra ?? null,
      modalitaConsegna: body.modalitaConsegna ?? null,
      consegnaData: body.consegnaData ? new Date(body.consegnaData) : null,
      consegnaOra: body.consegnaOra ?? null,
      totale: body.totale,
      totaleIe: body.totaleIe,
      acconto: body.acconto ?? 0,
      note: body.note ?? null,
      articoli: body.articoli,
      titolo: body.titolo ?? '',
      condizioniCommerciali: body.condizioniCommerciali ?? null,
      stato: body.stato,
      ordineId: body.ordineId ?? null,
    },
  });

  return NextResponse.json(p);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!await requireM361()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await prisma.oePreventivo.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
