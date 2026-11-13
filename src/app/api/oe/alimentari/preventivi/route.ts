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

function buildNumero(emporio: string, createdAt: Date, seq: number) {
  const d = createdAt;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const sigla = emporio.toUpperCase().slice(0, 2);
  return `${y}${m}${day}${sigla}-P${String(seq).padStart(2, '0')}`;
}

export async function GET(req: NextRequest) {
  if (!await requireM361()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const emporio = searchParams.get('emporio');
  const stato = searchParams.get('stato');
  const cerca = searchParams.get('cerca');

  const where: Record<string, unknown> = {};
  if (emporio) where.emporio = emporio;
  if (stato) where.stato = stato;
  if (cerca) {
    where.OR = [
      { clienteNome: { contains: cerca, mode: 'insensitive' } },
      { clienteCognome: { contains: cerca, mode: 'insensitive' } },
      { titolo: { contains: cerca, mode: 'insensitive' } },
      { numeroPreventivo: { contains: cerca, mode: 'insensitive' } },
    ];
  }

  const preventivi = await prisma.oePreventivo.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      numeroPreventivo: true,
      tipoOrdine: true,
      sottotipoNatale: true,
      emporio: true,
      canale: true,
      operatore: true,
      dataPreventivo: true,
      clienteNome: true,
      clienteCognome: true,
      clienteCellulare: true,
      clienteEmail: true,
      waAttivo: true,
      modalitaConsegna: true,
      consegnaData: true,
      totale: true,
      totaleIe: true,
      acconto: true,
      titolo: true,
      stato: true,
      ordineId: true,
      createdAt: true,
      dataModifica: true,
    },
  });

  return NextResponse.json(preventivi);
}

export async function POST(req: NextRequest) {
  if (!await requireM361()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const emporio: string = body.emporio || 'CR';
  const now = new Date();

  // numero progressivo per giorno+emporio
  const prefix = (() => {
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}${m}${d}${emporio.toUpperCase().slice(0, 2)}-P`;
  })();

  const existing = await prisma.oePreventivo.findMany({
    where: { numeroPreventivo: { startsWith: prefix } },
    select: { numeroPreventivo: true },
  });
  const maxSeq = existing.reduce((max, p) => {
    const n = parseInt(p.numeroPreventivo.split('-P')[1] ?? '0', 10);
    return Math.max(max, n);
  }, 0);
  const numero = `${prefix}${String(maxSeq + 1).padStart(2, '0')}`;

  const p = await prisma.oePreventivo.create({
    data: {
      numeroPreventivo: numero,
      tipoOrdine: body.tipoOrdine ?? 'standard',
      sottotipoNatale: body.sottotipoNatale ?? null,
      emporio,
      canale: body.canale ?? null,
      operatore: body.operatore ?? null,
      dataPreventivo: body.dataPreventivo ? new Date(body.dataPreventivo) : now,
      clienteNome: body.clienteNome ?? '',
      clienteCognome: body.clienteCognome ?? null,
      clienteCellulare: body.clienteCellulare ?? null,
      clienteEmail: body.clienteEmail ?? null,
      waAttivo: body.waAttivo ?? false,
      clienteExtra: body.clienteExtra ?? null,
      modalitaConsegna: body.modalitaConsegna ?? null,
      consegnaData: body.consegnaData ? new Date(body.consegnaData) : null,
      consegnaOra: body.consegnaOra ?? null,
      totale: body.totale ?? 0,
      totaleIe: body.totaleIe ?? 0,
      acconto: body.acconto ?? 0,
      note: body.note ?? null,
      articoli: body.articoli ?? [],
      titolo: body.titolo ?? '',
      condizioniCommerciali: body.condizioniCommerciali ?? null,
      stato: 'bozza',
    },
  });

  return NextResponse.json(p, { status: 201 });
}
