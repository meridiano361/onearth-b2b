import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { prisma } from '@/lib/prisma';
import { CART_PRODUCT_SELECT } from '@/lib/cartProductSelect';

function ownsCart(cart: { customerId: string | null; operatorId: string | null }, session: { user: { id: string; role: string } }) {
  if (session.user.role === 'CUSTOMER') return cart.customerId === session.user.id;
  if (session.user.role === 'OPERATOR' || isAdminRole(session.user.role)) return cart.operatorId === session.user.id;
  return false;
}

function serializeCart(cart: any) {
  return {
    ...cart,
    budgetPersonalizzato: cart.budgetPersonalizzato != null ? Number(cart.budgetPersonalizzato) : null,
    createdAt: cart.createdAt?.toISOString(),
    updatedAt: cart.updatedAt?.toISOString(),
    canale: cart.canale
      ? { ...cart.canale, budget: cart.canale.budget != null ? Number(cart.canale.budget) : null, createdAt: cart.canale.createdAt?.toISOString(), updatedAt: cart.canale.updatedAt?.toISOString() }
      : null,
    items: cart.items?.map((item: any) => ({
      productId: item.productId,
      taglia: item.taglia ?? '',
      quantity: item.quantity,
      product: item.product ? {
        ...item.product,
        costPrice: Number(item.product.costPrice),
        retailPrice: Number(item.product.retailPrice),
        costoIeConReso: item.product.costoIeConReso != null ? Number(item.product.costoIeConReso) : null,
        costoIeSenzaReso: item.product.costoIeSenzaReso != null ? Number(item.product.costoIeSenzaReso) : null,
      } : undefined,
    })),
  };
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const cart = await prisma.cart.findUnique({
      where: { id: params.id },
      include: { canale: true, items: { include: { product: { select: CART_PRODUCT_SELECT } }, orderBy: { createdAt: 'asc' } } },
    });

    if (!cart) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (!ownsCart(cart, session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    return NextResponse.json({ data: serializeCart(cart) });
  } catch (e: any) {
    console.error('[GET /api/catalog/carts/[id]]', e);
    return NextResponse.json({ error: e.message ?? 'Errore interno' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const cart = await prisma.cart.findUnique({ where: { id: params.id }, select: { customerId: true, operatorId: true } });
    if (!cart) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (!ownsCart(cart, session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const data: any = {};
    if (typeof body.name === 'string') data.name = body.name.trim();
    if (typeof body.notes === 'string' || body.notes === null) data.notes = body.notes;
    if (typeof body.canaleId !== 'undefined') data.canaleId = body.canaleId ?? null;
    if (typeof body.budgetPersonalizzato !== 'undefined') data.budgetPersonalizzato = body.budgetPersonalizzato ?? null;

    const updated = await prisma.cart.update({
      where: { id: params.id },
      data,
      include: { canale: true, items: { include: { product: { select: CART_PRODUCT_SELECT } }, orderBy: { createdAt: 'asc' } } },
    });

    return NextResponse.json({ data: serializeCart(updated) });
  } catch (e: any) {
    console.error('[PATCH /api/catalog/carts/[id]]', e);
    return NextResponse.json({ error: e.message ?? 'Errore interno' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const cart = await prisma.cart.findUnique({ where: { id: params.id }, select: { customerId: true, operatorId: true } });
    if (!cart) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (!ownsCart(cart, session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    await prisma.cart.delete({ where: { id: params.id } });
    return NextResponse.json({ message: 'Carrello eliminato' });
  } catch (e: any) {
    console.error('[DELETE /api/catalog/carts/[id]]', e);
    return NextResponse.json({ error: e.message ?? 'Errore interno' }, { status: 500 });
  }
}
