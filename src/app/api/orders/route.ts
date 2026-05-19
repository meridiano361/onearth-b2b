import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const orderItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().positive(),
});

const createOrderSchema = z.object({
  customerId: z.string().optional(),
  organizationId: z.string().optional(),
  canaleId: z.string().optional(),
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
      ? { ...order.customer, createdAt: order.customer.createdAt?.toISOString(), updatedAt: order.customer.updatedAt?.toISOString() }
      : undefined,
    organization: order.organization
      ? { ...order.organization, createdAt: order.organization.createdAt?.toISOString() }
      : undefined,
    canale: order.canale
      ? { ...order.canale, createdAt: order.canale.createdAt?.toISOString(), updatedAt: order.canale.updatedAt?.toISOString() }
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
    const organizationId = searchParams.get('organizationId');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const skip = (page - 1) * limit;

    const where: any = {};

    if (!isAdminRole(session.user.role)) {
      if (session.user.role === 'OPERATOR') {
        if (!session.user.canaleId) {
          // Operator hasn't selected a canale yet — return nothing
          return NextResponse.json({ data: [], total: 0, page: 1, pageSize: limit, totalPages: 0 });
        }
        where.OR = [
          { canaleId: session.user.canaleId },
          { operatorId: session.user.id },
        ];
      } else {
        // CUSTOMER (legacy) or any other non-admin role: filter by customerId
        where.customerId = session.user.id;
      }
    }

    if (status) where.status = status;
    if (isAdminRole(session.user.role)) {
      if (customerId) where.customerId = customerId;
      if (organizationId) where.organizationId = organizationId;
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          customer: {
            select: { id: true, companyName: true, customerCode: true, email: true, createdAt: true },
          },
          organization: { select: { id: true, nome: true, createdAt: true } },
          canale: { select: { id: true, nome: true, tipo: true, citta: true, organizationId: true, createdAt: true, updatedAt: true } },
          items: {
            include: {
              product: { include: { category: true } },
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

    // Validate and price items
    const productIds = data.items.map((i) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, isActive: true },
    });

    if (products.length !== productIds.length) {
      return NextResponse.json({ error: 'Uno o più prodotti non trovati o non attivi' }, { status: 400 });
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
      return { productId: item.productId, quantity: item.quantity, unitPrice, subtotal };
    });

    // Determine ownership
    let orderData: any = {
      collectionId: data.collectionId || null,
      status: 'MERCE_DA_ORDINARE',
      totalValue,
      totalItems,
      notes: data.notes || null,
      confirmedAt: new Date(),
      items: { create: orderItems },
    };

    if (session.user.role === 'OPERATOR') {
      orderData.organizationId = session.user.organizationId;
      orderData.canaleId = session.user.canaleId;
      orderData.operatorId = session.user.id;
    } else if (isAdminRole(session.user.role)) {
      if (data.customerId) orderData.customerId = data.customerId;
      if (data.organizationId) orderData.organizationId = data.organizationId;
      if (data.canaleId) orderData.canaleId = data.canaleId;
    } else {
      // CUSTOMER (legacy)
      orderData.customerId = session.user.id;
    }

    const order = await prisma.order.create({
      data: orderData,
      include: {
        customer: { select: { id: true, companyName: true, customerCode: true, email: true, createdAt: true } },
        organization: { select: { id: true, nome: true, createdAt: true } },
        canale: { select: { id: true, nome: true, tipo: true, citta: true, organizationId: true, createdAt: true, updatedAt: true } },
        items: { include: { product: { include: { category: true } } } },
      },
    });

    return NextResponse.json({ data: serializeOrder(order) }, { status: 201 });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return NextResponse.json({ error: 'Dati non validi', details: err.errors }, { status: 400 });
    }
    if (err.code === 'P2002') {
      return NextResponse.json({ error: 'Prodotto duplicato nell\'ordine' }, { status: 409 });
    }
    console.error('POST /api/orders error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
