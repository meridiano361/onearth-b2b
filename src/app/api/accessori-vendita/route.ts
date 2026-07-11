import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { LABEL_SUPPORTO } from '@/types/jewelry';
import type { TipoSupporto } from '@/types/jewelry';

// Mappa sottofamiglia prodotto → tipi supporto compatibili
const TIPO_MAP: Record<string, TipoSupporto[]> = {
  collana:   ['busto_legno',    'espositore_onearth'],
  bracciale: ['cono_legno',     'espositore_onearth'],
  orecchini: ['portaorecchini', 'espositore_onearth'],
};

// GET /api/accessori-vendita?tipo=collana|bracciale|orecchini
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tipo = req.nextUrl.searchParams.get('tipo');
    const tipiRicercati: TipoSupporto[] = tipo && TIPO_MAP[tipo]
      ? TIPO_MAP[tipo]
      : ['espositore_onearth'];

    const items = await prisma.supportoEspositivo.findMany({
      where: {
        attivo: true,
        tipo: { in: tipiRicercati },
        retailPrice: { not: null },   // mostra solo se il prezzo è stato compilato
      },
      orderBy: { nome: 'asc' },
    });

    return NextResponse.json({
      data: items.map((s) => ({
        id:           s.id,
        name:         s.nome,
        imageUrl:     s.immagineUrl || null,
        retailPrice:  s.retailPrice ? Number(s.retailPrice) : null,
        misura:       s.misura,
        note:         s.note,
        colore:       s.tono ? (s.tono === 'chiaro' ? 'Legno chiaro' : 'Legno scuro') : null,
        linkAcquisto: s.linkAcquisto,
        tipo:         s.tipo,
        tipoLabel:    LABEL_SUPPORTO[s.tipo],
      })),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
