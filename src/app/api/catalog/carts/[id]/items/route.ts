import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { prisma } from '@/lib/prisma';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const cart = await prisma.cart.findUnique({
      where: { id: params.id },
      select: { customerId: true, operatorId: true, status: true },
    });
    if (!cart) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const owns =
      (session.user.role === 'CUSTOMER' && cart.customerId === session.user.id) ||
      ((session.user.role === 'OPERATOR' || isAdminRole(session.user.role)) && cart.operatorId === session.user.id);
    if (!owns) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (cart.status !== 'DRAFT') return NextResponse.json({ error: 'Carrello già convertito' }, { status: 409 });

    const body = await req.json();
    const { productId, quantity, taglia = '' } = body as { productId: string; quantity: number; taglia?: string };
    if (!productId) return NextResponse.json({ error: 'productId obbligatorio' }, { status: 400 });

    if (quantity <= 0) {
      await prisma.cartItem.deleteMany({ where: { cartId: params.id, productId, taglia } });
      await prisma.cart.update({ where: { id: params.id }, data: {} });
      return NextResponse.json({ ok: true });
    }

    await prisma.cartItem.upsert({
      where: { cartId_productId_taglia: { cartId: params.id, productId, taglia } },
      create: { cartId: params.id, productId, taglia, quantity },
      update: { quantity },
    });
    await prisma.cart.update({ where: { id: params.id }, data: {} });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('[PATCH /api/catalog/carts/[id]/items]', e);
    return NextResponse.json({ error: e.message ?? 'Errore interno' }, { status: 500 });
  }
}
