import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { prisma } from '@/lib/prisma';
import { MODA_COLLEZIONE, MODA_BRANCH_ID, CASA_BRANCH_ID } from '@/lib/modaAccess';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const cart = await prisma.cart.findUnique({
    where: { id: params.id },
    include: { items: { include: { product: true } } },
  });
  if (!cart) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const owns =
    ((session.user.role === 'CUSTOMER' || isAdminRole(session.user.role)) && cart.customerId === session.user.id) ||
    (session.user.role === 'OPERATOR' && cart.operatorId === session.user.id);
  if (!owns) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (cart.status !== 'DRAFT') return NextResponse.json({ error: 'Carrello già convertito' }, { status: 409 });
  if (cart.items.length === 0) return NextResponse.json({ error: 'Il carrello è vuoto' }, { status: 400 });

  const canaleId = cart.canaleId ?? null;
  const budgetPersonalizzato = cart.budgetPersonalizzato != null ? Number(cart.budgetPersonalizzato) : null;

  // Detect catalog branch from products' collezione field
  const hasModaProducts = cart.items.some((i) => i.product.collezione === MODA_COLLEZIONE);
  const catalogBranch = hasModaProducts ? MODA_BRANCH_ID : CASA_BRANCH_ID;

  const orderItems = cart.items.map((item) => {
    const p = item.product as any;
    const con = Number(p.costoIeConReso);
    const sen = Number(p.costoIeSenzaReso);
    const unitPrice = con > 0 ? con : sen > 0 ? sen : Number(p.costPrice);
    return {
      productId: item.productId,
      taglia: p.taglia ?? '',
      quantity: item.quantity,
      unitPrice,
      subtotal: unitPrice * item.quantity,
      mercePronta: 0,
    };
  });

  const totalValue = orderItems.reduce((sum, i) => sum + Number(i.unitPrice) * i.quantity, 0);
  const totalItems = orderItems.reduce((sum, i) => sum + i.quantity, 0);

  const orderData: any = {
    totalValue,
    totalItems,
    notes: cart.notes ?? null,
    canaleId: canaleId ?? null,
    budgetPersonalizzato: budgetPersonalizzato ?? null,
    catalogBranch,
    items: { create: orderItems },
  };

  if (session.user.role === 'CUSTOMER' || isAdminRole(session.user.role)) {
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
