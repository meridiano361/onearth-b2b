import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateSchema = z.object({
  status: z.enum(['DRAFT', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'CANCELLED']).optional(),
  notes: z.string().optional().nullable(),
});

function serializeOrder(order: any) {
  return {
    ...order,
    totalValue: Number(order.totalValue),
    createdAt: order.createdAt?.toISOString(),
    confirmedAt: order.confirmedAt?.toISOString() || null,
    updatedAt: order.updatedAt?.toISOString(),
    items: order.items?.map((item: any) => ({
      ...item,
      unitPrice: Number(item.unitPrice),
      subtotal: Number(item.subtotal),
      product: item.product
        ? {
            ...item.product,
            costPrice: Number(item.product.costPrice),
            retailPrice: Number(item.product.retailPrice),
            createdAt: item.product.createdAt?.toISOString(),
            updatedAt: item.product.updatedAt?.toISOString(),
          }
        : undefined,
    })),
    customer: order.customer
      ? { ...order.customer, createdAt: order.customer.createdAt?.toISOString() }
      : undefined,
  };
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: {
        customer: true,
        items: {
          include: {
            product: { include: { category: true } },
          },
        },
      },
    });

    if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Customers can only view their own orders
    if (session.user.role === 'CUSTOMER' && order.customerId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ data: serializeOrder(order) });
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
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const data = updateSchema.parse(body);

    const updateData: any = { ...data };
    if (data.status === 'CONFIRMED') {
      updateData.confirmedAt = new Date();
    }

    const order = await prisma.order.update({
      where: { id: params.id },
      data: updateData,
      include: {
        customer: {
          select: {
            id: true,
            companyName: true,
            customerCode: true,
            email: true,
            createdAt: true,
          },
        },
        items: {
          include: {
            product: { include: { category: true } },
          },
        },
      },
    });

    return NextResponse.json({ data: serializeOrder(order) });
  } catch (err: any) {
    if (err.code === 'P2025') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
