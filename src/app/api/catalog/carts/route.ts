import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { prisma } from '@/lib/prisma';
import { CART_PRODUCT_SELECT } from '@/lib/cartProductSelect';

function userWhere(session: { user: { id: string; role: string } }) {
  if (session.user.role === 'CUSTOMER') return { customerId: session.user.id };
  if (session.user.role === 'OPERATOR' || isAdminRole(session.user.role)) return { operatorId: session.user.id };
  return null;
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

// GET /api/catalog/carts?collection=moda|casa
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const where = userWhere(session);
    if (!where) return NextResponse.json({ data: [] });

    const collection = req.nextUrl.searchParams.get('collection');

    const carts = await prisma.cart.findMany({
      where: {
        ...where,
        status: 'DRAFT',
        ...(collection ? { collectionId: collection } : {}),
      },
      include: {
        _count: { select: { items: true } },
        canale: true,
        items: {
          include: { product: { select: CART_PRODUCT_SELECT } },
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

// POST /api/catalog/carts — body: { name, collectionId }
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const where = userWhere(session);
    if (!where) return NextResponse.json({ error: 'Role not supported' }, { status: 400 });

    const { name, collectionId = 'casa', canaleId, budgetPersonalizzato } = await req.json();
    if (!name?.trim()) return NextResponse.json({ error: 'Nome carrello obbligatorio' }, { status: 400 });

    const validCollections = ['moda', 'casa'];
    const safeCollectionId = validCollections.includes(collectionId) ? collectionId : 'casa';

    const cart = await prisma.cart.create({
      data: {
        name: name.trim(),
        collectionId: safeCollectionId,
        canaleId: canaleId || null,
        budgetPersonalizzato: budgetPersonalizzato ?? null,
        ...where,
      },
      include: { canale: true, items: { include: { product: { select: CART_PRODUCT_SELECT } } } },
    });

    return NextResponse.json({ data: serializeCart(cart) }, { status: 201 });
  } catch (e: any) {
    console.error('[POST /api/catalog/carts]', e);
    return NextResponse.json({ error: e.message ?? 'Errore interno' }, { status: 500 });
  }
}
