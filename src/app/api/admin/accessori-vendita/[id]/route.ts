import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { prisma } from '@/lib/prisma';

function serialize(a: any) {
  return {
    ...a,
    retailPrice: Number(a.retailPrice),
    costPrice: Number(a.costPrice),
    createdAt: a.createdAt?.toISOString(),
    updatedAt: a.updatedAt?.toISOString(),
  };
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    const body = await req.json();
    const { code, name, retailPrice, costPrice, misura, imageUrl, note, colore, linkAcquisto, tipoTarget, isActive } = body;
    const data: any = {};
    if (code !== undefined) data.code = code.trim();
    if (name !== undefined) data.name = name.trim();
    if (retailPrice !== undefined) data.retailPrice = retailPrice;
    if (costPrice !== undefined) data.costPrice = costPrice;
    if (misura !== undefined) data.misura = misura?.trim() || null;
    if (imageUrl !== undefined) data.imageUrl = imageUrl?.trim() || null;
    if (note !== undefined) data.note = note?.trim() || null;
    if (colore !== undefined) data.colore = colore?.trim() || null;
    if (linkAcquisto !== undefined) data.linkAcquisto = linkAcquisto?.trim() || null;
    if (tipoTarget !== undefined) data.tipoTarget = tipoTarget;
    if (isActive !== undefined) data.isActive = isActive;

    const item = await prisma.accessorioVendita.update({ where: { id: params.id }, data });
    return NextResponse.json({ data: serialize(item) });
  } catch (e: any) {
    if (e.code === 'P2025') return NextResponse.json({ error: 'Non trovato' }, { status: 404 });
    if (e.code === 'P2002') return NextResponse.json({ error: 'Codice già esistente' }, { status: 409 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    await prisma.accessorioVendita.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e.code === 'P2025') return NextResponse.json({ error: 'Non trovato' }, { status: 404 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
