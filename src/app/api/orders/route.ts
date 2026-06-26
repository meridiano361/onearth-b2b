import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { getPreviewFromSession } from '@/lib/preview';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const orderItemSchema = z.object({
  productId: z.string(),
  quantity: z.coerce.number().int().positive(),
  unitPrice: z.coerce.number().positive(),
});

const createOrderSchema = z.object({
  customerId: z.string().optional(),
  organizationId: z.string().optional(),
  canaleId: z.string().optional().nullable(),
  collectionId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  budgetPersonalizzato: z.coerce.number().nonnegative().optional().nullable(),
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
    operator: order.operator ?? undefined,
    destinazione: order.canale
      ? { ...order.canale, budget: order.canale.budget != null ? Number(order.canale.budget) : null, createdAt: order.canale.createdAt?.toISOString(), updatedAt: order.canale.updatedAt?.toISOString() }
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

    const preview = getPreviewFromSession(session);

    if (preview) {
      // Preview mode: show the simulated org's orders
      where.organizationId = preview.organizationId;
    } else if (!isAdminRole(session.user.role)) {
      if (session.user.role === 'OPERATOR') {
        // Fetch orgId from DB (session could be stale)
        const op = await prisma.operator.findUnique({ where: { id: session.user.id }, select: { organizationId: true } });
        const orgId = op?.organizationId ?? session.user.organizationId;
        console.log('[GET /api/orders] OPERATOR', session.user.id, 'orgId:', orgId);
        const orClauses: any[] = [{ operatorId: session.user.id }];
        if (orgId) orClauses.push({ organizationId: orgId });
        where.OR = orClauses;
      } else {
        // CUSTOMER (legacy) or any other non-admin role: filter by customerId
        where.customerId = session.user.id;
      }
    }
    console.log('[GET /api/orders] where:', JSON.stringify(where));

    if (status) where.status = status;
    if (!preview && isAdminRole(session.user.role)) {
      if (myOrders) {
        where.customerId = session.user.id;
      } else {
        if (customerId) where.customerId = customerId;
        if (organizationId) where.organizationId = organizationId;
      }
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          customer: {
            select: { id: true, companyName: true, customerCode: true, email: true, createdAt: true },
          },
          organization: { select: { id: true, nome: true, createdAt: true } },
          operator: { select: { id: true, nome: true, cognome: true, email: true } },
          canale: { select: { id: true, nome: true, tipo: true, citta: true, budget: true, organizationId: true, createdAt: true, updatedAt: true } },
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

    if (getPreviewFromSession(session)) {
      return NextResponse.json(
        { error: 'Non puoi creare ordini in modalità anteprima', previewMode: true },
        { status: 403 }
      );
    }

    const body = await req.json();
    console.log('[POST /api/orders] body items:', JSON.stringify(body?.items?.length), 'role:', session.user.role, 'canaleId:', body?.canaleId);

    const data = createOrderSchema.parse(body);

    // Validate and price items
    const productIds = data.items.map((i) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, isActive: true },
    });

    if (products.length !== productIds.length) {
      const foundIds = new Set(products.map((p) => p.id));
      const missingIds = productIds.filter((id) => !foundIds.has(id));
      console.error('[POST /api/orders] prodotti non trovati o inattivi:', missingIds);
      return NextResponse.json({ error: `Prodotti non trovati o non più attivi: rimuovili dal carrello e riprova.`, missing: missingIds }, { status: 400 });
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
      budgetPersonalizzato: data.budgetPersonalizzato != null ? data.budgetPersonalizzato : null,
      items: { create: orderItems },
    };

    if (session.user.role === 'OPERATOR') {
      // If organizationId missing from session (old JWT), fetch from DB
      const orgId = session.user.organizationId ??
        (await prisma.operator.findUnique({ where: { id: session.user.id }, select: { organizationId: true } }))?.organizationId;
      orderData.organizationId = orgId || null;
      orderData.canaleId = data.canaleId || null;
      orderData.operatorId = session.user.id;
    } else if (isAdminRole(session.user.role)) {
      if (data.customerId) orderData.customerId = data.customerId;
      if (data.organizationId) orderData.organizationId = data.organizationId;
      if (data.canaleId) orderData.canaleId = data.canaleId;
    } else {
      // CUSTOMER (legacy)
      orderData.customerId = session.user.id;
    }

    // Generate order number #YYYYMMDDOOOOODD##
    if (orderData.organizationId && orderData.canaleId) {
      const [org, canale] = await Promise.all([
        prisma.organization.findUnique({ where: { id: orderData.organizationId }, select: { nome: true } }),
        prisma.canale.findUnique({ where: { id: orderData.canaleId }, select: { tipo: true } }),
      ]);
      if (org && canale) {
        const now = new Date();
        const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
        const org5 = org.nome.replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 5).padEnd(5, 'X');
        const destMap: Record<string, string> = {
          BOTTEGA: 'BO', EMPORIO: 'EM', DISTRETTO: 'DI', STORE: 'ST',
          OUTLET: 'OU', TENDONE: 'TE', FIERA: 'FI', ONLINE: 'ON', ALTRO: 'AL',
        };
        const dest2 = destMap[canale.tipo] ?? 'AL';
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
        const count = await prisma.order.count({
          where: { organizationId: orderData.organizationId, createdAt: { gte: startOfDay, lt: endOfDay } },
        });
        orderData.orderNumber = `#${date}${org5}${dest2}${String(count + 1).padStart(2, '0')}`;
      }
    }

    console.log('[POST /api/orders] creating order', { orgId: orderData.organizationId, canaleId: orderData.canaleId, opId: orderData.operatorId, items: orderItems.length });
    const order = await prisma.order.create({
      data: orderData,
      include: {
        customer: { select: { id: true, companyName: true, customerCode: true, email: true, createdAt: true } },
        organization: { select: { id: true, nome: true, createdAt: true } },
        canale: { select: { id: true, nome: true, tipo: true, citta: true, budget: true, organizationId: true, createdAt: true, updatedAt: true } },
        items: { include: { product: { include: { category: true } } } },
      },
    });
    console.log('[POST /api/orders] created:', order.id, order.orderNumber);

    return NextResponse.json({ data: serializeOrder(order) }, { status: 201 });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      console.error('[POST /api/orders] ZodError:', JSON.stringify(err.errors));
      return NextResponse.json({ error: 'Dati non validi', details: err.errors }, { status: 400 });
    }
    if (err.code === 'P2002') {
      console.error('[POST /api/orders] P2002 duplicate:', err.meta);
      return NextResponse.json({ error: 'Prodotto duplicato nell\'ordine' }, { status: 409 });
    }
    console.error('[POST /api/orders] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
