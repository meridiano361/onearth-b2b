import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { prisma } from '@/lib/prisma';

function userWhere(session: { user: { id: string; role: string } }) {
  if (session.user.role === 'CUSTOMER') return { customerId: session.user.id };
  if (session.user.role === 'OPERATOR' || isAdminRole(session.user.role)) return { operatorId: session.user.id };
  return null;
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

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const where = userWhere(session);
    if (!where) return NextResponse.json({ data: [] });

    const carts = await prisma.cart.findMany({
      where: { ...where, status: 'DRAFT' },
      include: {
        _count: { select: { items: true } },
        items: {
          include: { product: { include: { category: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json({ data: carts.map(serializeCart) });
  } catch (e: any) {
    console.error('[GET /api/catalog/carts]', e);
    return NextResponse.json({ error: e.message ?? 'Errore interno' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const where = userWhere(session);
    if (!where) return NextResponse.json({ error: 'Role not supported' }, { status: 400 });

    const { name } = await req.json();
    if (!name?.trim()) return NextResponse.json({ error: 'Nome carrello obbligatorio' }, { status: 400 });

    const cart = await prisma.cart.create({
      data: { name: name.trim(), ...where },
      include: { items: { include: { product: { include: { category: true } } } } },
    });

    return NextResponse.json({ data: serializeCart(cart) }, { status: 201 });
  } catch (e: any) {
    console.error('[POST /api/catalog/carts]', e);
    return NextResponse.json({ error: e.message ?? 'Errore interno' }, { status: 500 });
  }
}
