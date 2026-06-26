import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { prisma } from '@/lib/prisma';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const cart = await prisma.cart.findUnique({
    where: { id: params.id },
    select: { customerId: true, operatorId: true, status: true },
  });
  if (!cart) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const owns =
    ((session.user.role === 'CUSTOMER' || isAdminRole(session.user.role)) && cart.customerId === session.user.id) ||
    (session.user.role === 'OPERATOR' && cart.operatorId === session.user.id);
  if (!owns) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (cart.status !== 'DRAFT') return NextResponse.json({ error: 'Carrello già convertito' }, { status: 409 });

  const { productId, quantity } = await req.json();
  if (!productId) return NextResponse.json({ error: 'productId obbligatorio' }, { status: 400 });

  if (quantity <= 0) {
    await prisma.cartItem.deleteMany({ where: { cartId: params.id, productId } });
    // touch updatedAt
    await prisma.cart.update({ where: { id: params.id }, data: {} });
    return NextResponse.json({ ok: true });
  }

  await prisma.cartItem.upsert({
    where: { cartId_productId: { cartId: params.id, productId } },
    create: { cartId: params.id, productId, quantity },
    update: { quantity },
  });
  await prisma.cart.update({ where: { id: params.id }, data: {} });

  return NextResponse.json({ ok: true });
}
