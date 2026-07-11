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

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    const items = await prisma.accessorioVendita.findMany({ orderBy: { createdAt: 'asc' } });
    return NextResponse.json({ data: items.map(serialize) });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    const body = await req.json();
    const { code, name, retailPrice, costPrice, misura, imageUrl, note, colore, linkAcquisto, tipoTarget, isActive } = body;
    if (!code?.trim() || !name?.trim() || retailPrice == null || costPrice == null) {
      return NextResponse.json({ error: 'Codice, nome, prezzi obbligatori' }, { status: 400 });
    }
    if (!Array.isArray(tipoTarget) || tipoTarget.length === 0) {
      return NextResponse.json({ error: 'Seleziona almeno un tipo destinatario' }, { status: 400 });
    }
    const item = await prisma.accessorioVendita.create({
      data: {
        code: code.trim(),
        name: name.trim(),
        retailPrice,
        costPrice,
        misura: misura?.trim() || null,
        imageUrl: imageUrl?.trim() || null,
        note: note?.trim() || null,
        colore: colore?.trim() || null,
        linkAcquisto: linkAcquisto?.trim() || null,
        tipoTarget,
        isActive: isActive ?? true,
      },
    });
    return NextResponse.json({ data: serialize(item) }, { status: 201 });
  } catch (e: any) {
    if (e.code === 'P2002') return NextResponse.json({ error: 'Codice già esistente' }, { status: 409 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
