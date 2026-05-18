import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const schema = z.object({ quantity: z.number().int().min(1) });

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; itemId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const order = await prisma.order.findUnique({
      where: { id: params.id },
      select: { customerId: true },
    });
    if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (session.user.role === 'CUSTOMER' && order.customerId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { quantity } = schema.parse(await req.json());

    const item = await prisma.orderItem.findUnique({
      where: { id: params.itemId, orderId: params.id },
      select: { unitPrice: true },
    });
    if (!item) return NextResponse.json({ error: 'Item non trovato' }, { status: 404 });

    const subtotal = Number(item.unitPrice) * quantity;
    await prisma.orderItem.update({
      where: { id: params.itemId },
      data: { quantity, subtotal },
    });

    // Recalculate order totals
    const allItems = await prisma.orderItem.findMany({
      where: { orderId: params.id },
      select: { quantity: true, subtotal: true },
    });
    await prisma.order.update({
      where: { id: params.id },
      data: {
        totalValue: allItems.reduce((s, it) => s + Number(it.subtotal), 0),
        totalItems: allItems.reduce((s, it) => s + it.quantity, 0),
      },
    });

    return NextResponse.json({ data: { quantity, subtotal } });
  } catch (err: any) {
    if (err.name === 'ZodError') return NextResponse.json({ error: 'Quantità non valida' }, { status: 400 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; itemId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const order = await prisma.order.findUnique({
      where: { id: params.id },
      select: { customerId: true },
    });
    if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (session.user.role === 'CUSTOMER' && order.customerId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.orderItem.delete({ where: { id: params.itemId, orderId: params.id } });

    // Recalculate order totals
    const allItems = await prisma.orderItem.findMany({
      where: { orderId: params.id },
      select: { quantity: true, subtotal: true },
    });
    await prisma.order.update({
      where: { id: params.id },
      data: {
        totalValue: allItems.reduce((s, it) => s + Number(it.subtotal), 0),
        totalItems: allItems.reduce((s, it) => s + it.quantity, 0),
      },
    });

    return NextResponse.json({ message: 'Rimosso' });
  } catch (err: any) {
    if (err.code === 'P2025') return NextResponse.json({ error: 'Item non trovato' }, { status: 404 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
