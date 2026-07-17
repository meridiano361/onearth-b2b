import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { toCartId, items } = body as {
    toCartId: string;
    items: { productId: string; quantity: number; taglia: string }[];
  };

  if (!toCartId || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'Dati mancanti' }, { status: 400 });
  }

  const [sourceCart, targetCart] = await Promise.all([
    prisma.cart.findUnique({ where: { id: params.id }, select: { customerId: true, operatorId: true } }),
    prisma.cart.findUnique({ where: { id: toCartId }, select: { customerId: true, operatorId: true, status: true } }),
  ]);

  if (!sourceCart) return NextResponse.json({ error: 'Carrello sorgente non trovato' }, { status: 404 });
  if (!targetCart) return NextResponse.json({ error: 'Carrello destinazione non trovato' }, { status: 404 });

  const owns = (cart: { customerId: string | null; operatorId: string | null }) =>
    (session.user.role === 'CUSTOMER' && cart.customerId === session.user.id) ||
    ((session.user.role === 'OPERATOR' || isAdminRole(session.user.role)) && cart.operatorId === session.user.id);

  if (!owns(sourceCart)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (!owns(targetCart)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (targetCart.status !== 'DRAFT') return NextResponse.json({ error: 'Carrello destinazione già convertito' }, { status: 409 });

  for (const item of items) {
    await prisma.cartItem.upsert({
      where: { cartId_productId_taglia: { cartId: toCartId, productId: item.productId, taglia: item.taglia ?? '' } },
      create: { cartId: toCartId, productId: item.productId, taglia: item.taglia ?? '', quantity: item.quantity },
      update: { quantity: item.quantity },
    });
  }
  await prisma.cart.update({ where: { id: toCartId }, data: {} });

  return NextResponse.json({ ok: true, copied: items.length });
}
