import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { prisma } from '@/lib/prisma';

// DELETE /api/admin/accessori-vendita/[id]
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    await prisma.supportoEspositivo.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e.code === 'P2025') return NextResponse.json({ error: 'Non trovato' }, { status: 404 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PATCH /api/admin/accessori-vendita/[id]
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    const body = await req.json();
    const data: any = {};
    if (body.nome         !== undefined) data.nome         = body.nome?.trim()         || null;
    if (body.immagineUrl  !== undefined) data.immagineUrl  = body.immagineUrl?.trim()  || '';
    if (body.codice       !== undefined) data.codice       = body.codice?.trim()       || null;
    if (body.retailPrice  !== undefined) data.retailPrice  = body.retailPrice  != null ? Number(body.retailPrice)  : null;
    if (body.costPrice    !== undefined) data.costPrice    = body.costPrice    != null ? Number(body.costPrice)    : null;
    if (body.misura       !== undefined) data.misura       = body.misura?.trim()       || null;
    if (body.note         !== undefined) data.note         = body.note?.trim()         || null;
    if (body.linkAcquisto !== undefined) data.linkAcquisto = body.linkAcquisto?.trim() || null;

    const item = await prisma.supportoEspositivo.update({ where: { id: params.id }, data });
    return NextResponse.json({
      data: {
        id:           item.id,
        nome:         item.nome,
        immagineUrl:  item.immagineUrl,
        codice:       item.codice,
        retailPrice:  item.retailPrice  != null ? Number(item.retailPrice)  : null,
        costPrice:    item.costPrice    != null ? Number(item.costPrice)    : null,
        misura:       item.misura,
        note:         item.note,
        linkAcquisto: item.linkAcquisto,
      },
    });
  } catch (e: any) {
    if (e.code === 'P2025') return NextResponse.json({ error: 'Non trovato' }, { status: 404 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
