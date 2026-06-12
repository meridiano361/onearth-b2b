import { NextRequest, NextResponse } from 'next/server';
import { requireModaSession } from '@/lib/modaAccess';
import { prisma } from '@/lib/prisma';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireModaSession();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const look = await prisma.look.findUnique({
    where: { id: params.id },
    include: {
      prodotti: {
        orderBy: { ordine: 'asc' },
        include: {
          product: {
            select: {
              id: true, code: true, name: true, description: true,
              imageUrl: true, imageUrl2: true, imageUrl3: true, imageUrl4: true,
              costPrice: true, retailPrice: true, lotSize: true, iva: true,
              colore: true, famiglia: true, nomLinea: true, stagione: true,
            },
          },
        },
      },
    },
  });

  if (!look || look.collezione !== 'PE27') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ data: look });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireModaSession();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.titolo !== undefined) data.titolo = body.titolo;
  if (body.descrizione !== undefined) data.descrizione = body.descrizione || null;
  if (body.imageUrl !== undefined) data.imageUrl = body.imageUrl || null;
  if (body.isActive !== undefined) data.isActive = body.isActive;
  if (body.ordine !== undefined) data.ordine = body.ordine;

  const look = await prisma.look.update({ where: { id: params.id }, data });
  return NextResponse.json({ data: look });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireModaSession();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await prisma.look.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
