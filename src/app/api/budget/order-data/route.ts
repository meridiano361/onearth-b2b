/**
 * GET /api/budget/order-data
 * Returns aggregated order data grouped by (conferente, famiglia, sottoclasse).
 *
 * ?orderId=xxx  → only that specific order (must belong to caller's org)
 * (no param)    → all non-cancelled MODA PE27 orders for the org
 *                 + DRAFT MODA carts for the current operator
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isMeridiano361Org } from '@/lib/modaServer';
import { prisma } from '@/lib/prisma';
import { MODA_BRANCH_ID } from '@/lib/modaAccess';

const FORBIDDEN = NextResponse.json({ error: 'Forbidden' }, { status: 403 });

type AggRow = { conferente: string; famiglia: string; sottoclasse: string; pezzi: number; imponibile: number; retailStimato: number };

// Mirror of CustomerOrdersView.effectiveUnitCost: prefers costoIe fields over unitPrice
function effectiveCost(p: { costoIeConReso: any; costoIeSenzaReso: any }, unitPrice: number): number {
  const con = Number(p.costoIeConReso);
  const sen = Number(p.costoIeSenzaReso);
  if (con > 0) return con;
  if (sen > 0) return sen;
  return unitPrice;
}

function makeAgg() {
  const agg = new Map<string, AggRow>();

  function add(
    conferente: string | null,
    famiglia: string | null,
    sottoclasse: string | null,
    quantity: number,
    unitPrice: number,
    retailPrice: number,
  ) {
    const c = conferente  || 'N/D';
    const f = famiglia    || 'N/D';
    const s = sottoclasse || 'N/D';
    const key = `${c}|${f}|${s}`;
    const existing = agg.get(key);
    if (existing) {
      existing.pezzi        += quantity;
      existing.imponibile   += unitPrice * quantity;
      existing.retailStimato += retailPrice * quantity;
    } else {
      agg.set(key, { conferente: c, famiglia: f, sottoclasse: s, pezzi: quantity, imponibile: unitPrice * quantity, retailStimato: retailPrice * quantity });
    }
  }

  return { add, values: () => Array.from(agg.values()) };
}

const ITEM_SELECT = {
  quantity: true,
  unitPrice: true,
  product: {
    select: {
      conferente: true,
      famiglia: true,
      sottoclasse: true,
      retailPrice: true,
      costoIeConReso: true,
      costoIeSenzaReso: true,
    },
  },
} as const;

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return FORBIDDEN;
  const ok = await isMeridiano361Org(session.user.role, session.user.organizationId);
  if (!ok) return FORBIDDEN;

  const orgId      = session.user.organizationId!;
  const operatorId = session.user.id;
  const orderId    = new URL(req.url).searchParams.get('orderId');
  const { add, values } = makeAgg();

  if (orderId) {
    // Single-order mode: verify ownership then aggregate only that order
    const orderItems = await prisma.orderItem.findMany({
      where: {
        order: {
          id: orderId,
          organizationId: orgId,
          catalogBranch: MODA_BRANCH_ID,
          status: { not: 'ANNULLATO' },
        },
      },
      select: ITEM_SELECT,
    });

    for (const it of orderItems) {
      const p = it.product;
      add(p.conferente, p.famiglia, p.sottoclasse, it.quantity, effectiveCost(p, Number(it.unitPrice)), p.retailPrice != null ? Number(p.retailPrice) : 0);
    }
  } else {
    // All-orders mode: all non-cancelled org orders + operator DRAFT carts
    const orderItems = await prisma.orderItem.findMany({
      where: { order: { organizationId: orgId, catalogBranch: MODA_BRANCH_ID, status: { not: 'ANNULLATO' } } },
      select: ITEM_SELECT,
    });

    for (const it of orderItems) {
      const p = it.product;
      add(p.conferente, p.famiglia, p.sottoclasse, it.quantity, effectiveCost(p, Number(it.unitPrice)), p.retailPrice != null ? Number(p.retailPrice) : 0);
    }

    const cartItems = await prisma.cartItem.findMany({
      where: { cart: { operatorId, collectionId: 'moda', status: 'DRAFT' } },
      select: ITEM_SELECT,
    });

    for (const it of cartItems) {
      const p = it.product;
      const con = Number(p.costoIeConReso);
      const sen = Number(p.costoIeSenzaReso);
      const unitPrice = con > 0 ? con : sen > 0 ? sen : 0;
      add(p.conferente, p.famiglia, p.sottoclasse, it.quantity, unitPrice, p.retailPrice != null ? Number(p.retailPrice) : 0);
    }
  }

  return NextResponse.json({ data: values() });
}
