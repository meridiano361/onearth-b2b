import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { prisma } from '@/lib/prisma';

function ownsCart(cart: { customerId: string | null; operatorId: string | null }, session: { user: { id: string; role: string } }) {
  if (session.user.role === 'CUSTOMER') return cart.customerId === session.user.id;
  if (session.user.role === 'OPERATOR' || isAdminRole(session.user.role)) return cart.operatorId === session.user.id;
  return false;
}

function serializeCart(cart: any) {
  return {
    ...cart,
    createdAt: cart.createdAt?.toISOString(),
    updatedAt: cart.updatedAt?.toISOString(),
    items: cart.items?.map((item: any) => ({
      productId: item.productId,
      quantity: item.quantity,
      product: item.product ? {
        ...item.product,
        costPrice: Number(item.product.costPrice),
        retailPrice: Number(item.product.retailPrice),
        createdAt: item.product.createdAt?.toISOString(),
        updatedAt: item.product.updatedAt?.toISOString(),
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
      include: { items: { include: { product: { include: { category: true } } }, orderBy: { createdAt: 'asc' } } },
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
    const data: { name?: string; notes?: string } = {};
    if (typeof body.name === 'string') data.name = body.name.trim();
    if (typeof body.notes === 'string' || body.notes === null) data.notes = body.notes;

    const updated = await prisma.cart.update({
      where: { id: params.id },
      data,
      include: { items: { include: { product: { include: { category: true } } }, orderBy: { createdAt: 'asc' } } },
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
