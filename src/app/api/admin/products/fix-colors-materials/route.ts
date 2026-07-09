import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { prisma } from '@/lib/prisma';
import { MATERIALE_OPTIONS } from '@/lib/productConstants';

const MATERIALE_LOWER = (MATERIALE_OPTIONS as readonly string[]).map((m) => ({
  lower: m.toLowerCase(),
  canonical: m,
}));

function capitalizeFirst(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function canonicalizeMaterial(raw: string): string {
  const lower = raw.toLowerCase();
  return MATERIALE_LOWER.find((m) => m.lower === lower)?.canonical ?? raw;
}

function normalizeMaterialField(v: string | null): string | null {
  if (!v) return v;
  const m = v.match(/^(\d+(?:\.\d+)?)\s*%\s+(.+)$/);
  if (m) {
    const canonical = canonicalizeMaterial(m[2].trim());
    return `${m[1]}% ${canonical}`;
  }
  return canonicalizeMaterial(v.trim());
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { dryRun = false } = await req.json().catch(() => ({}));

    const products = await prisma.product.findMany({
      select: {
        id: true,
        colore: true, colore2: true, colore3: true,
        materiale1: true, materiale2: true, materiale3: true,
      },
    });

    type Fix = {
      id: string;
      colore?: string; colore2?: string; colore3?: string;
      materiale1?: string; materiale2?: string; materiale3?: string;
    };

    const toFix: Fix[] = [];

    for (const p of products) {
      const fix: Fix = { id: p.id };
      let needsFix = false;

      // Colors: capitalize first letter
      const nc1 = p.colore ? capitalizeFirst(p.colore) : p.colore;
      const nc2 = p.colore2 ? capitalizeFirst(p.colore2) : p.colore2;
      const nc3 = p.colore3 ? capitalizeFirst(p.colore3) : p.colore3;
      if (nc1 !== p.colore) { fix.colore = nc1 ?? undefined; needsFix = true; }
      if (nc2 !== p.colore2) { fix.colore2 = nc2 ?? undefined; needsFix = true; }
      if (nc3 !== p.colore3) { fix.colore3 = nc3 ?? undefined; needsFix = true; }

      // Materials: case-insensitive canonicalization
      const nm1 = normalizeMaterialField(p.materiale1);
      const nm2 = normalizeMaterialField(p.materiale2);
      const nm3 = normalizeMaterialField(p.materiale3);
      if (nm1 !== p.materiale1) { fix.materiale1 = nm1 ?? undefined; needsFix = true; }
      if (nm2 !== p.materiale2) { fix.materiale2 = nm2 ?? undefined; needsFix = true; }
      if (nm3 !== p.materiale3) { fix.materiale3 = nm3 ?? undefined; needsFix = true; }

      if (needsFix) toFix.push(fix);
    }

    if (dryRun) {
      return NextResponse.json({
        total: products.length,
        toFix: toFix.length,
        examples: toFix.slice(0, 10),
      });
    }

    let fixed = 0;
    for (const { id, ...data } of toFix) {
      await prisma.product.update({ where: { id }, data });
      fixed++;
    }

    return NextResponse.json({ fixed, total: products.length });
  } catch (err) {
    console.error('[fix-colors-materials]', err);
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 });
  }
}
