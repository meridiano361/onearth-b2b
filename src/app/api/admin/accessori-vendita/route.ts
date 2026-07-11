import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { prisma } from '@/lib/prisma';
import { LABEL_SUPPORTO } from '@/types/jewelry';

function serialize(s: any) {
  return {
    id:           s.id,
    nome:         s.nome,
    codice:       s.codice,
    tipo:         s.tipo,
    tipoLabel:    LABEL_SUPPORTO[s.tipo as keyof typeof LABEL_SUPPORTO] ?? s.tipo,
    tono:         s.tono,
    immagineUrl:  s.immagineUrl,
    attivo:       s.attivo,
    retailPrice:  s.retailPrice != null ? Number(s.retailPrice) : null,
    costPrice:    s.costPrice   != null ? Number(s.costPrice)   : null,
    misura:       s.misura,
    note:         s.note,
    linkAcquisto: s.linkAcquisto,
  };
}

// POST /api/admin/accessori-vendita — crea nuovo supporto (o duplica passando sourceId)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdminRole(session.user.role)) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    const body = await req.json();

    let createData: any;
    if (body.sourceId) {
      // Duplicate from existing
      const src = await prisma.supportoEspositivo.findUniqueOrThrow({ where: { id: body.sourceId } });
      createData = {
        nome:         src.nome + ' (copia)',
        tipo:         src.tipo,
        tono:         src.tono,
        immagineUrl:  src.immagineUrl,
        larghezzaPx:  src.larghezzaPx,
        altezzaPx:    src.altezzaPx,
        attivo:       src.attivo,
        codice:       src.codice,
        retailPrice:  src.retailPrice,
        costPrice:    src.costPrice,
        misura:       src.misura,
        note:         src.note,
        linkAcquisto: src.linkAcquisto,
      };
    } else {
      if (!body.nome?.trim() || !body.tipo) return NextResponse.json({ error: 'Nome e tipo obbligatori' }, { status: 400 });
      createData = {
        nome:         body.nome.trim(),
        tipo:         body.tipo,
        tono:         body.tono || null,
        immagineUrl:  body.immagineUrl?.trim() || '',
        codice:       body.codice?.trim() || null,
        retailPrice:  body.retailPrice != null ? Number(body.retailPrice) : null,
        costPrice:    body.costPrice   != null ? Number(body.costPrice)   : null,
        misura:       body.misura?.trim() || null,
        note:         body.note?.trim()   || null,
        linkAcquisto: body.linkAcquisto?.trim() || null,
      };
    }

    const item = await prisma.supportoEspositivo.create({ data: createData });
    return NextResponse.json({ data: serialize(item) }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// GET /api/admin/accessori-vendita — lista supporti con campi commerciali
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    const items = await prisma.supportoEspositivo.findMany({
      where: { tipo: { not: 'parete_ganci' } }, // parete_ganci non è un accessorio da vendere
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json({ data: items.map(serialize) });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
