import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generateOrderPDF } from '@/lib/export/pdf';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { orderId } = await req.json();
    if (!orderId) return NextResponse.json({ error: 'orderId required' }, { status: 400 });

    const order = await prisma.order.findUnique({
      where: { id: orderId },
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

    const buffer = await generateOrderPDF(serializedOrder as any);
    const filename = `order-${order.id.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.pdf`;

    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(buffer.length),
      },
    });
  } catch (err) {
    console.error('PDF export error:', err);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
