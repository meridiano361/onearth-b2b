import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { prisma } from '@/lib/prisma';
import { titleCase } from '@/lib/normalizeClassification';

function forbidden() {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || !isAdminRole(session.user.role)) return null;
  return session;
}

// GET — list distinct produttori with product count (union with lookup table)
export async function GET() {
  const session = await requireAdmin();
  if (!session) return forbidden();

  // Distinct values used in products
  const productGroups = await prisma.product.groupBy({
    by: ['produttore'],
    where: { produttore: { not: null } },
    _count: { produttore: true },
  });

  // All entries in the lookup table
  const lookupEntries = await prisma.produttore.findMany({ orderBy: { nome: 'asc' } });

  // Merge: product-based counts + lookup entries with count=0 not already in products
  const countMap = new Map<string, number>();
  for (const g of productGroups) {
    if (g.produttore) countMap.set(g.produttore, g._count.produttore);
  }
  for (const l of lookupEntries) {
    if (!countMap.has(l.nome)) countMap.set(l.nome, 0);
  }

  const result = Array.from(countMap.entries())
    .map(([nome, count]) => ({ nome, count }))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'it'));

  return NextResponse.json({ data: result });
}

// POST — add new produttore to lookup table
export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return forbidden();

  const { nome } = await req.json();
  if (!nome?.trim()) return NextResponse.json({ error: 'Nome obbligatorio' }, { status: 400 });

  const normalized = titleCase(nome);
  const existing = await prisma.produttore.findUnique({ where: { nome: normalized } });
  if (existing) return NextResponse.json({ error: 'Produttore già esistente' }, { status: 409 });

  await prisma.produttore.create({ data: { nome: normalized } });
  return NextResponse.json({ ok: true });
}

// PATCH — rename produttore (updates all products + lookup table)
export async function PATCH(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return forbidden();

  const { vecchioNome, nuovoNome } = await req.json();
  if (!vecchioNome?.trim() || !nuovoNome?.trim()) {
    return NextResponse.json({ error: 'vecchioNome e nuovoNome obbligatori' }, { status: 400 });
  }

  const normalized = titleCase(nuovoNome);

  // Update all products
  const { count } = await prisma.product.updateMany({
    where: { produttore: vecchioNome },
    data: { produttore: normalized },
  });

  // Update lookup table entry if it exists
  const existing = await prisma.produttore.findUnique({ where: { nome: vecchioNome } });
  if (existing) {
    const targetExists = await prisma.produttore.findUnique({ where: { nome: normalized } });
    if (targetExists) {
      await prisma.produttore.delete({ where: { nome: vecchioNome } });
    } else {
      await prisma.produttore.update({ where: { nome: vecchioNome }, data: { nome: normalized } });
    }
  }

  return NextResponse.json({ ok: true, updated: count });
}

// DELETE — remove produttore only if no products use it
export async function DELETE(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return forbidden();

  const { nome } = await req.json();
  if (!nome?.trim()) return NextResponse.json({ error: 'Nome obbligatorio' }, { status: 400 });

  const count = await prisma.product.count({ where: { produttore: nome } });
  if (count > 0) {
    return NextResponse.json(
      { error: `${count} prodott${count === 1 ? 'o usa' : 'i usano'} questo produttore` },
      { status: 409 }
    );
  }

  await prisma.produttore.deleteMany({ where: { nome } });
  return NextResponse.json({ ok: true });
}
