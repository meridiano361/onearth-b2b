import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { normalizeProductClassificationFields } from '@/lib/normalizeClassification';
import { normalizeProductName } from '@/lib/normalizeProductName';

const updateSchema = z.object({
  code: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  costPrice: z.coerce.number().positive().optional(),
  retailPrice: z.coerce.number().positive().optional(),
  lotSize: z.coerce.number().int().positive().optional(),
  imageUrl: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  collectionId: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  stock: z.coerce.number().int().optional().nullable(),
  famiglia: z.string().optional().nullable(),
  sottofamiglia: z.string().optional().nullable(),
  colore: z.string().optional().nullable(),
  nomLinea: z.string().optional().nullable(),
  misura: z.string().optional().nullable(),
  produttore: z.string().optional().nullable(),
  gruppoMerceologico: z.string().optional().nullable(),
  classe: z.string().optional().nullable(),
  sottoclasse: z.string().optional().nullable(),
  gruppoOmogeneo: z.string().optional().nullable(),
  stagione: z.string().optional().nullable(),
  temaColore: z.string().optional().nullable(),
  fasciaRicarico: z.string().optional().nullable(),
  fasciaSconto: z.coerce.number().min(0).max(100).optional().nullable(),
  collezione: z.string().optional().nullable(),
  tranche: z.string().optional().nullable(),
  iva: z.coerce.number().int().min(0).max(100).optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const product = await prisma.product.findUnique({
      where: { id: params.id },
      include: { category: true, collection: true },
    });

    if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json({
      data: {
        ...product,
        costPrice: Number(product.costPrice),
        retailPrice: Number(product.retailPrice),
        createdAt: product.createdAt.toISOString(),
        updatedAt: product.updatedAt.toISOString(),
      },
    });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const data = normalizeProductClassificationFields(updateSchema.parse(body));

    // Normalize name if provided, using the incoming nomLinea or the existing one
    if (data.name) {
      const linea = data.nomLinea !== undefined
        ? data.nomLinea
        : (await prisma.product.findUnique({ where: { id: params.id }, select: { nomLinea: true } }))?.nomLinea;
      data.name = normalizeProductName(data.name, linea);
    }

    const product = await prisma.product.update({
      where: { id: params.id },
      data,
      include: { category: true },
    });

    return NextResponse.json({
      data: {
        ...product,
        costPrice: Number(product.costPrice),
        retailPrice: Number(product.retailPrice),
        createdAt: product.createdAt.toISOString(),
        updatedAt: product.updatedAt.toISOString(),
      },
    });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return NextResponse.json({ error: 'Invalid data', details: err.errors }, { status: 400 });
    }
    if (err.code === 'P2025') {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.product.delete({ where: { id: params.id } });
    return NextResponse.json({ message: 'Product deleted' });
  } catch (err: any) {
    if (err.code === 'P2025') {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
