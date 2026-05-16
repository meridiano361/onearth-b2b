import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const orderItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().positive(),
});

const createOrderSchema = z.object({
  customerId: z.string().optional(),
  collectionId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  items: z.array(orderItemSchema).min(1),
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
      mercePronta: item.mercePronta ?? 0,
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
      ? {
          ...order.customer,
          createdAt: order.customer.createdAt?.toISOString(),
          updatedAt: order.customer.updatedAt?.toISOString(),
        }
      : undefined,
  };
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const myOrders = searchParams.get('my') === 'true';
    const status = searchParams.get('status');
    const customerId = searchParams.get('customerId');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const skip = (page - 1) * limit;

    const where: any = {};

    // Customers can only see their own orders
    if (session.user.role === 'CUSTOMER' || myOrders) {
      where.customerId = session.user.id;
    }

    if (status) where.status = status;
    if (customerId && session.user.role === 'ADMIN') where.customerId = customerId;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
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
              product: {
                include: { category: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    return NextResponse.json({
      data: orders.map(serializeOrder),
      total,
      page,
      pageSize: limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error('GET /api/orders error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const data = createOrderSchema.parse(body);

    // Use the session user's ID (customers can only create for themselves)
    const effectiveCustomerId =
      session.user.role === 'ADMIN' && data.customerId
        ? data.customerId
        : session.user.id;

    // Validate and price items
    const productIds = data.items.map((i) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, isActive: true },
    });

    if (products.length !== productIds.length) {
      return NextResponse.json({ error: 'One or more products not found or inactive' }, { status: 400 });
    }

    const productMap = new Map(products.map((p) => [p.id, p]));

    let totalValue = 0;
    let totalItems = 0;
    const orderItems = data.items.map((item) => {
      const product = productMap.get(item.productId)!;
      const unitPrice = Number(product.costPrice);
      const subtotal = unitPrice * item.quantity;
      totalValue += subtotal;
      totalItems += item.quantity;
      return {
        productId: item.productId,
        quantity: item.quantity,
        unitPrice,
        subtotal,
      };
    });

    const order = await prisma.order.create({
      data: {
        customerId: effectiveCustomerId,
        collectionId: data.collectionId || null,
        status: 'MERCE_DA_ORDINARE',
        totalValue,
        totalItems,
        notes: data.notes || null,
        confirmedAt: new Date(),
        items: {
          create: orderItems,
        },
      },
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
            product: {
              include: { category: true },
            },
          },
        },
      },
    });

    // Simulate email notification
    console.log(
      `[EMAIL] New order ${order.id} from ${order.customer?.companyName} — ${order.totalItems} items, €${Number(order.totalValue).toFixed(2)}`
    );

    return NextResponse.json({ data: serializeOrder(order) }, { status: 201 });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return NextResponse.json({ error: 'Invalid data', details: err.errors }, { status: 400 });
    }
    if (err.code === 'P2002') {
      return NextResponse.json({ error: 'Duplicate order item' }, { status: 409 });
    }
    console.error('POST /api/orders error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
