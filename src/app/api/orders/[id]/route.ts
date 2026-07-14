import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateSchema = z.object({
  status: z.enum([
    'MERCE_DA_ORDINARE',
    'MERCE_ORDINATA',
    'MERCE_PARZIALMENTE_PRONTA',
    'MERCE_PRONTA_DA_AVVISARE',
    'MERCE_PRONTA_AVVISATO',
    'ESPORTATO',
  ]).optional(),
  notes: z.string().optional().nullable(),
  canaleId: z.string().optional().nullable(),
});

const FILL_MERCE_STATUSES = new Set([
  'MERCE_PARZIALMENTE_PRONTA',
  'MERCE_PRONTA_DA_AVVISARE',
  'MERCE_PRONTA_AVVISATO',
]);

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
            costPrice:         Number(item.product.costPrice),
            retailPrice:       Number(item.product.retailPrice),
            costoIeConReso:    item.product.costoIeConReso   != null ? Number(item.product.costoIeConReso)   : null,
            costoIeSenzaReso:  item.product.costoIeSenzaReso != null ? Number(item.product.costoIeSenzaReso) : null,
            createdAt: item.product.createdAt?.toISOString(),
            updatedAt: item.product.updatedAt?.toISOString(),
          }
        : undefined,
    })),
    customer: order.customer
      ? { ...order.customer, createdAt: order.customer.createdAt?.toISOString() }
      : undefined,
    destinazione: order.canale
      ? { ...order.canale, budget: order.canale.budget != null ? Number(order.canale.budget) : null, createdAt: order.canale.createdAt?.toISOString(), updatedAt: order.canale.updatedAt?.toISOString() }
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

    if (!isAdminRole(session.user.role)) {
      if (session.user.role === 'OPERATOR' && order.organizationId !== session.user.organizationId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      if (session.user.role === 'CUSTOMER' && order.customerId !== session.user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
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
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const data = updateSchema.parse(body);

    // Operators/customers can only: mark order as ESPORTATO, or change canaleId
    if (session.user.role === 'OPERATOR' || session.user.role === 'CUSTOMER') {
      const isChangingCanale = data.canaleId !== undefined && !data.status;
      const isMarkingExported = data.status === 'ESPORTATO';
      if (!isChangingCanale && !isMarkingExported) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      const orderCheck = await prisma.order.findUnique({
        where: { id: params.id },
        select: { customerId: true, organizationId: true },
      });
      if (!orderCheck) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      if (session.user.role === 'OPERATOR' && orderCheck.organizationId !== session.user.organizationId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      if (session.user.role === 'CUSTOMER' && orderCheck.customerId !== session.user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      if (isChangingCanale && data.canaleId && session.user.organizationId) {
        const canale = await prisma.canale.findFirst({
          where: { id: data.canaleId, organizationId: session.user.organizationId },
          select: { id: true },
        });
        if (!canale) return NextResponse.json({ error: 'Destinazione non trovata' }, { status: 404 });
      }

      const updatePayload: any = isMarkingExported ? { status: 'ESPORTATO' } : { canaleId: data.canaleId };
      const updated = await prisma.order.update({
        where: { id: params.id },
        data: updatePayload,
        include: {
          customer: { select: { id: true, companyName: true, customerCode: true, email: true, createdAt: true } },
          organization: { select: { id: true, nome: true, createdAt: true } },
          canale: { select: { id: true, nome: true, tipo: true, citta: true, organizationId: true, createdAt: true, updatedAt: true } },
          items: { include: { product: { include: { category: true } } } },
        },
      });
      return NextResponse.json({ data: serializeOrder(updated) });
    }

    // Admin path below

    const updateData: any = { ...data };

    // When moving to a "ready" status, auto-fill mercePronta = quantity for all items
    if (data.status && FILL_MERCE_STATUSES.has(data.status)) {
      const existing = await prisma.order.findUnique({
        where: { id: params.id },
        select: { items: { select: { id: true, quantity: true } } },
      });
      if (existing?.items.length) {
        await prisma.$transaction(
          existing.items.map((item) =>
            prisma.orderItem.update({
              where: { id: item.id },
              data: { mercePronta: item.quantity },
            })
          )
        );
      }
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

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!isAdminRole(session.user.role)) {
      const order = await prisma.order.findUnique({
        where: { id: params.id },
        select: { customerId: true, organizationId: true, status: true },
      });
      if (!order) return NextResponse.json({ error: 'Ordine non trovato' }, { status: 404 });
      if (session.user.role === 'OPERATOR' && order.organizationId !== session.user.organizationId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      if (session.user.role === 'CUSTOMER' && order.customerId !== session.user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    await prisma.order.delete({ where: { id: params.id } });

    return NextResponse.json({ message: 'Ordine eliminato' });
  } catch (err: any) {
    if (err.code === 'P2025') {
      return NextResponse.json({ error: 'Ordine non trovato' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
