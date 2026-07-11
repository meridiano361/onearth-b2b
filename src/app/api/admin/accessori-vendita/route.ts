import { NextResponse } from 'next/server';
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
