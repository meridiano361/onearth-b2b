import { NextRequest, NextResponse } from 'next/server';
import { requireMondiEspositivi } from '@/lib/featureGuard';
import { prisma } from '@/lib/prisma';

const FORBIDDEN = NextResponse.json({ error: 'Forbidden' }, { status: 403 });

const GROUP_INCLUDE = {
  prodotti: {
    orderBy: { posizione: 'asc' as const },
    include: {
      orderItem: {
        include: {
          product: {
            select: {
              id: true, code: true, name: true, description: true,
              imageUrl: true, imageUrl2: true, imageUrl3: true, imageUrl4: true,
              retailPrice: true, costPrice: true, lotSize: true,
              nomLinea: true, colore: true, stagione: true, collezione: true,
              temaColore: true, temaColore2: true, temaColore3: true, temaColore4: true, temaColore5: true,
              produttore: true, paese: true, misura: true,
              classe: true, classe2: true, sottoclasse: true, sottoclasse2: true,
              gruppoOmogeneo: true, gruppoOmogeneo2: true,
              fasciaSconto: true, fasciaRicarico: true,
            },
          },
        },
      },
    },
  },
  schedules: { orderBy: { settimanaIn: 'asc' as const } },
} as const;

export async function GET(_req: NextRequest, { params }: { params: { orderId: string } }) {
  const operatorId = await requireMondiEspositivi();
  if (!operatorId) return FORBIDDEN;

  const groups = await prisma.displayGroup.findMany({
    where: { orderId: params.orderId },
    orderBy: { posizione: 'asc' },
    include: GROUP_INCLUDE,
  });

  return NextResponse.json({ groups });
}

export async function POST(req: NextRequest, { params }: { params: { orderId: string } }) {
  const operatorId = await requireMondiEspositivi();
  if (!operatorId) return FORBIDDEN;

  const body = await req.json();
  const { nome, descrizione, coloreTag, stagione, temaTag } = body as Record<string, string | undefined>;

  if (!nome?.trim()) return NextResponse.json({ error: 'nome obbligatorio' }, { status: 400 });

  const lastGroup = await prisma.displayGroup.findFirst({
    where: { orderId: params.orderId },
    orderBy: { posizione: 'desc' },
    select: { posizione: true },
  });
  const posizione = (lastGroup?.posizione ?? -1) + 1;

  const group = await prisma.displayGroup.create({
    data: {
      orderId: params.orderId,
      nome: nome.trim(),
      descrizione: descrizione?.trim() || null,
      coloreTag: coloreTag || null,
      stagione: stagione?.trim() || null,
      temaTag: temaTag?.trim() || null,
      posizione,
    },
    include: GROUP_INCLUDE,
  });

  return NextResponse.json({ group }, { status: 201 });
}
