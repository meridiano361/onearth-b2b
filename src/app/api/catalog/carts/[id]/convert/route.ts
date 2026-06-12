import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const cart = await prisma.cart.findUnique({
    where: { id: params.id },
    include: { items: { include: { product: true } } },
  });
  if (!cart) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const owns =
    (session.user.role === 'CUSTOMER' && cart.customerId === session.user.id) ||
    (session.user.role === 'OPERATOR' && cart.operatorId === session.user.id);
  if (!owns) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (cart.status !== 'DRAFT') return NextResponse.json({ error: 'Carrello già convertito' }, { status: 409 });
  if (cart.items.length === 0) return NextResponse.json({ error: 'Il carrello è vuoto' }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const { canaleId, budgetPersonalizzato } = body as { canaleId?: string; budgetPersonalizzato?: number };

  const orderItems = cart.items.map((item) => ({
    productId: item.productId,
    quantity: item.quantity,
    unitPrice: item.product.costPrice,
    subtotal: Number(item.product.costPrice) * item.quantity,
    mercePronta: 0,
  }));

  const totalValue = orderItems.reduce((sum, i) => sum + Number(i.unitPrice) * i.quantity, 0);
  const totalItems = orderItems.reduce((sum, i) => sum + i.quantity, 0);

  const orderData: any = {
    totalValue,
    totalItems,
    notes: cart.notes ?? null,
    canaleId: canaleId ?? null,
    budgetPersonalizzato: budgetPersonalizzato ?? null,
    items: { create: orderItems },
  };

  if (session.user.role === 'CUSTOMER') {
    orderData.customerId = session.user.id;
  } else if (session.user.role === 'OPERATOR') {
    const op = await prisma.operator.findUnique({ where: { id: session.user.id }, select: { organizationId: true } });
    orderData.organizationId = op?.organizationId ?? null;
    orderData.operatorId = session.user.id;
  }

  const [order] = await prisma.$transaction([
    prisma.order.create({ data: orderData }),
    prisma.cart.update({ where: { id: params.id }, data: { status: 'CONVERTED' } }),
  ]);

  return NextResponse.json({ data: { id: order.id } }, { status: 201 });
}
