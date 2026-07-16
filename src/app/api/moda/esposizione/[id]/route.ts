import { NextRequest, NextResponse } from 'next/server';
import { requireVisualSession } from '@/lib/modaServer';
import { prisma } from '@/lib/prisma';

const PRODUCT_SELECT = {
  id: true, code: true, name: true,
  imageUrl: true, imageUrl2: true, imageUrl3: true,
  costPrice: true, costoIeConReso: true, costoIeSenzaReso: true,
  retailPrice: true, lotSize: true, iva: true,
  colore: true, famiglia: true, sottofamiglia: true, classe: true, descrizione: true,
} as const;

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireVisualSession();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const outfit = await prisma.outfitEspositivo.findUnique({
    where: { id: params.id },
    include: {
      items: {
        orderBy: { ordine: 'asc' },
        include: { product: { select: PRODUCT_SELECT } },
      },
    },
  });

  if (!outfit || outfit.collezione !== 'PE27') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ data: outfit });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireVisualSession();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.titolo !== undefined) data.titolo = body.titolo;
  if (body.descrizione !== undefined) data.descrizione = body.descrizione || null;
  if (body.coloriGuida !== undefined) data.coloriGuida = body.coloriGuida;
  if (body.fantasia !== undefined) data.fantasia = body.fantasia || null;
  if (body.imageUrl !== undefined) data.imageUrl = body.imageUrl || null;
  if (body.isActive !== undefined) data.isActive = body.isActive;

  const outfit = await prisma.outfitEspositivo.update({ where: { id: params.id }, data });
  return NextResponse.json({ data: outfit });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireVisualSession();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await prisma.outfitEspositivo.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
