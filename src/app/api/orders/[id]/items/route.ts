import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const schema = z.object({
  productId: z.string(),
  quantity: z.number().int().min(1),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const order = await prisma.order.findUnique({
      where: { id: params.id },
      select: { customerId: true, status: true },
    });
    if (!order) return NextResponse.json({ error: 'Ordine non trovato' }, { status: 404 });

    if (session.user.role === 'CUSTOMER') {
      if (order.customerId !== session.user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      if (order.status === 'ESPORTATO') {
        return NextResponse.json({ error: 'Non puoi modificare un ordine esportato' }, { status: 403 });
      }
    }

    const { productId, quantity } = schema.parse(await req.json());

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, costPrice: true, isActive: true },
    });
    if (!product || !product.isActive) {
      return NextResponse.json({ error: 'Prodotto non trovato o non attivo' }, { status: 404 });
    }

    const unitPrice = Number(product.costPrice);
    const subtotal = unitPrice * quantity;

    // Check if item already exists in this order
    const existing = await prisma.orderItem.findFirst({
      where: { orderId: params.id, productId },
    });

    let item;
    if (existing) {
      const newQty = existing.quantity + quantity;
      const newSubtotal = unitPrice * newQty;
      item = await prisma.orderItem.update({
        where: { id: existing.id },
        data: { quantity: newQty, subtotal: newSubtotal },
        include: { product: { include: { category: true } } },
      });
    } else {
      item = await prisma.orderItem.create({
        data: {
          orderId: params.id,
          productId,
          quantity,
          unitPrice,
          subtotal,
          mercePronta: 0,
        },
        include: { product: { include: { category: true } } },
      });
    }

    // Recalculate order totals
    const allItems = await prisma.orderItem.findMany({
      where: { orderId: params.id },
      select: { quantity: true, subtotal: true },
    });
    const totalValue = allItems.reduce((s, it) => s + Number(it.subtotal), 0);
    const totalItems = allItems.reduce((s, it) => s + it.quantity, 0);
    await prisma.order.update({
      where: { id: params.id },
      data: { totalValue, totalItems },
    });

    return NextResponse.json({
      data: {
        item: {
          ...item,
          unitPrice: Number(item.unitPrice),
          subtotal: Number(item.subtotal),
          product: item.product
            ? {
                ...item.product,
                costPrice: Number(item.product.costPrice),
                retailPrice: Number(item.product.retailPrice),
                createdAt: item.product.createdAt?.toISOString(),
                updatedAt: (item.product as any).updatedAt?.toISOString(),
              }
            : undefined,
        },
        order: { totalValue, totalItems },
      },
    });
  } catch (err: any) {
    if (err.name === 'ZodError') return NextResponse.json({ error: 'Dati non validi' }, { status: 400 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
