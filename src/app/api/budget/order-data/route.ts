/**
 * GET /api/budget/order-data
 * Returns aggregated order + cart data grouped by (conferente, famiglia, sottoclasse).
 * Reads:
 *  - All non-cancelled MODA PE27 orders for the operator's organization
 *  - All DRAFT MODA carts for the current operator
 */
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isMeridiano361Org } from '@/lib/modaServer';
import { prisma } from '@/lib/prisma';
import { MODA_BRANCH_ID } from '@/lib/modaAccess';

const FORBIDDEN = NextResponse.json({ error: 'Forbidden' }, { status: 403 });

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return FORBIDDEN;
  const ok = await isMeridiano361Org(session.user.role, session.user.organizationId);
  if (!ok) return FORBIDDEN;

  const orgId = session.user.organizationId!;
  const operatorId = session.user.id;

  // ── Orders ────────────────────────────────────────────────────────────────
  const orderItems = await prisma.orderItem.findMany({
    where: {
      order: {
        organizationId: orgId,
        catalogBranch: MODA_BRANCH_ID,
        status: { not: 'ANNULLATO' },
      },
    },
    select: {
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
    },
  });

  // ── Active carts ─────────────────────────────────────────────────────────
  const cartItems = await prisma.cartItem.findMany({
    where: {
      cart: { operatorId, collectionId: 'moda', status: 'DRAFT' },
    },
    select: {
      quantity: true,
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
    },
  });

  // ── Aggregate ────────────────────────────────────────────────────────────
  type Key = string; // `${conferente}|${famiglia}|${sottoclasse}`
  const agg = new Map<Key, { conferente: string; famiglia: string; sottoclasse: string; pezzi: number; imponibile: number; retailStimato: number }>();

  function addRow(
    conferente: string | null,
    famiglia: string | null,
    sottoclasse: string | null,
    quantity: number,
    unitPrice: number,
    retailPrice: number,
  ) {
    const c = conferente || 'N/D';
    const f = famiglia   || 'N/D';
    const s = sottoclasse || 'N/D';
    const key: Key = `${c}|${f}|${s}`;
    const existing = agg.get(key);
    if (existing) {
      existing.pezzi += quantity;
      existing.imponibile += unitPrice * quantity;
      existing.retailStimato += retailPrice * quantity;
    } else {
      agg.set(key, {
        conferente: c, famiglia: f, sottoclasse: s,
        pezzi: quantity,
        imponibile: unitPrice * quantity,
        retailStimato: retailPrice * quantity,
      });
    }
  }

  for (const it of orderItems) {
    const p = it.product;
    const retail = p.retailPrice != null ? Number(p.retailPrice) : 0;
    addRow(p.conferente, p.famiglia, p.sottoclasse, it.quantity, Number(it.unitPrice), retail);
  }

  for (const it of cartItems) {
    const p = it.product;
    const con = Number(p.costoIeConReso);
    const sen = Number(p.costoIeSenzaReso);
    const unitPrice = con > 0 ? con : sen > 0 ? sen : Number((p as any).costPrice ?? 0);
    const retail = p.retailPrice != null ? Number(p.retailPrice) : 0;
    addRow(p.conferente, p.famiglia, p.sottoclasse, it.quantity, unitPrice, retail);
  }

  return NextResponse.json({ data: Array.from(agg.values()) });
}
