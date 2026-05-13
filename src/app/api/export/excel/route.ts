import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generateCartExcel, generateOrderExcel } from '@/lib/export/excel';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();

    let buffer: Buffer;
    let filename: string;

    if (body.orderId) {
      // Export saved order
      const order = await prisma.order.findUnique({
        where: { id: body.orderId },
        include: {
          customer: {
            select: { id: true, companyName: true, customerCode: true, email: true, createdAt: true },
          },
          items: {
            include: {
              product: { include: { category: true } },
            },
          },
        },
      });

      if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

      // Auth check
      if (session.user.role === 'CUSTOMER' && order.customerId !== session.user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      const serializedOrder = {
        ...order,
        totalValue: Number(order.totalValue),
        createdAt: order.createdAt.toISOString(),
        confirmedAt: order.confirmedAt?.toISOString() || null,
        updatedAt: order.updatedAt.toISOString(),
        items: order.items.map((item) => ({
          ...item,
          unitPrice: Number(item.unitPrice),
          subtotal: Number(item.subtotal),
          product: item.product ? {
            ...item.product,
            costPrice: Number(item.product.costPrice),
            retailPrice: Number(item.product.retailPrice),
            createdAt: item.product.createdAt.toISOString(),
            updatedAt: item.product.updatedAt.toISOString(),
          } : undefined,
        })),
        customer: order.customer ? {
          ...order.customer,
          createdAt: order.customer.createdAt.toISOString(),
        } : undefined,
      };

      buffer = await generateOrderExcel(serializedOrder as any);
      filename = `order-${order.id.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.xlsx`;
    } else {
      // Export from cart payload
      buffer = await generateCartExcel({
        items: body.items || [],
        customerCode: body.customerCode || session.user.customerCode,
        companyName: body.companyName || session.user.companyName,
      });
      filename = `order-${session.user.customerCode}-${new Date().toISOString().slice(0, 10)}.xlsx`;
    }

    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(buffer.length),
      },
    });
  } catch (err) {
    console.error('Excel export error:', err);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
