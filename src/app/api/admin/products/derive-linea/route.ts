import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { prisma } from '@/lib/prisma';
import { extractLineaFromName, normalizeProductName } from '@/lib/normalizeProductName';

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Trova prodotti moda senza nomLinea (o linea vuota)
  const products = await prisma.product.findMany({
    where: {
      gruppoMerceologico: { equals: 'Moda', mode: 'insensitive' },
      OR: [{ nomLinea: null }, { nomLinea: '' }],
    },
    select: { id: true, name: true, dettaglio: true, nomLinea: true },
  });

  let updated = 0;
  const skipped: string[] = [];

  for (const p of products) {
    const linea = extractLineaFromName(p.name);
    if (!linea) { skipped.push(p.name); continue; }

    const newName = normalizeProductName(p.name, linea, null, p.dettaglio);
    await prisma.product.update({
      where: { id: p.id },
      data: { nomLinea: linea, name: newName },
    });
    updated++;
  }

  return NextResponse.json({ updated, skipped: skipped.length, total: products.length });
}
