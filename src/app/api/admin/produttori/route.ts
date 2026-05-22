import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { prisma } from '@/lib/prisma';

function forbidden() {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || !isAdminRole(session.user.role)) return null;
  return session;
}

// GET — list distinct produttori with product count
export async function GET() {
  const session = await requireAdmin();
  if (!session) return forbidden();

  const productGroups = await prisma.product.groupBy({
    by: ['produttore'],
    where: { produttore: { not: null } },
    _count: { produttore: true },
  });

  const lookupEntries = await prisma.produttore.findMany({
    orderBy: { nome: 'asc' },
    select: { nome: true, paese: true },
  });

  const countMap = new Map<string, number>();
  for (const g of productGroups) {
    if (g.produttore) countMap.set(g.produttore, g._count.produttore);
  }

  const paeseMap = new Map<string, string | null>();
  for (const l of lookupEntries) {
    paeseMap.set(l.nome, l.paese ?? null);
    if (!countMap.has(l.nome)) countMap.set(l.nome, 0);
  }

  const result = Array.from(countMap.entries())
    .map(([nome, count]) => ({ nome, count, paese: paeseMap.get(nome) ?? null }))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'it'));

  return NextResponse.json({ data: result });
}

// POST — add new produttore to lookup table
export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return forbidden();

  const { nome, paese } = await req.json();
  if (!nome?.trim()) return NextResponse.json({ error: 'Nome obbligatorio' }, { status: 400 });

  const normalized = nome.trim();
  const existing = await prisma.produttore.findUnique({ where: { nome: normalized } });
  if (existing) return NextResponse.json({ error: 'Produttore già esistente' }, { status: 409 });

  await prisma.produttore.create({ data: { nome: normalized, paese: paese || null } });
  return NextResponse.json({ ok: true });
}

// PATCH — rename or update paese on produttore
export async function PATCH(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return forbidden();

  const { vecchioNome, nuovoNome, paese } = await req.json();
  if (!vecchioNome?.trim()) {
    return NextResponse.json({ error: 'vecchioNome obbligatorio' }, { status: 400 });
  }

  const effectiveNuovo = nuovoNome?.trim() ? nuovoNome.trim() : vecchioNome;
  const isRename = effectiveNuovo !== vecchioNome;
  const updatesPaese = paese !== undefined;

  // Rename products if name changed
  let productCount = 0;
  if (isRename) {
    const { count } = await prisma.product.updateMany({
      where: { produttore: vecchioNome },
      data: { produttore: effectiveNuovo },
    });
    productCount = count;
  }

  // Cascade paese to products that have this produttore and no paese set
  if (updatesPaese && paese) {
    const targetNome = isRename ? effectiveNuovo : vecchioNome;
    await prisma.product.updateMany({
      where: { produttore: targetNome, paese: null },
      data: { paese },
    });
  }

  // Update lookup table
  const existing = await prisma.produttore.findUnique({ where: { nome: vecchioNome } });
  if (existing) {
    if (isRename) {
      const targetExists = await prisma.produttore.findUnique({ where: { nome: effectiveNuovo } });
      if (targetExists) {
        // Merge: delete old entry, update target's paese if needed
        await prisma.produttore.delete({ where: { nome: vecchioNome } });
        if (updatesPaese) {
          await prisma.produttore.update({ where: { nome: effectiveNuovo }, data: { paese: paese ?? null } });
        }
      } else {
        await prisma.produttore.update({
          where: { nome: vecchioNome },
          data: { nome: effectiveNuovo, ...(updatesPaese ? { paese: paese ?? null } : {}) },
        });
      }
    } else if (updatesPaese) {
      await prisma.produttore.update({ where: { nome: vecchioNome }, data: { paese: paese ?? null } });
    }
  } else if (updatesPaese) {
    // Upsert lookup entry if it doesn't exist yet
    await prisma.produttore.upsert({
      where: { nome: effectiveNuovo },
      update: { paese: paese ?? null },
      create: { nome: effectiveNuovo, paese: paese ?? null },
    });
  }

  return NextResponse.json({ ok: true, updated: productCount });
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
