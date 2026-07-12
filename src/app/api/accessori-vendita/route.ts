import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { LABEL_SUPPORTO } from '@/types/jewelry';
import type { TipoSupporto } from '@/types/jewelry';

// Mappa categoria gioiello → tipi supporto compatibili (espositore_onearth è universale per tutti)
const TIPO_MAP: Record<string, TipoSupporto[]> = {
  collana:   ['busto_legno',    'espositore_onearth'],
  bracciale: ['cono_legno',     'espositore_onearth'],
  orecchini: ['portaorecchini', 'espositore_onearth'],
  anello:    ['cono_legno',     'espositore_onearth'],
};

// Normalizza classe/sottofamiglia prodotto → chiave di TIPO_MAP
export function normalizzaCategoria(val: string): string | null {
  const s = val.toLowerCase();
  if (s.includes('collana') || s.includes('collane')) return 'collana';
  if (s.includes('bracciale') || s.includes('bracciali')) return 'bracciale';
  if (s.includes('orecchino') || s.includes('orecchini')) return 'orecchini';
  if (s.includes('anello') || s.includes('anelli')) return 'anello';
  return null;
}

// GET /api/accessori-vendita?tipo=collana|bracciale|orecchini|anello
// Accetta anche ?classe=<Product.classe> come alternativa
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tipoParam = req.nextUrl.searchParams.get('tipo');
    const classeParam = req.nextUrl.searchParams.get('classe');

    // Determina la categoria: prima dal param esplicito, poi normalizzando classe
    const categoria =
      (tipoParam && TIPO_MAP[tipoParam] ? tipoParam : null) ??
      (classeParam ? normalizzaCategoria(classeParam) : null);

    // Se non c'è una categoria riconosciuta non mostrare nulla
    if (!categoria) return NextResponse.json({ data: [] });

    const tipiRicercati = TIPO_MAP[categoria];

    const items = await prisma.supportoEspositivo.findMany({
      where: {
        attivo: true,
        tipo: { in: tipiRicercati },
        retailPrice: { not: null },
      },
      orderBy: [
        { tipo: 'asc' },
        { nome: 'asc' },
      ],
    });

    return NextResponse.json({
      data: items.map((s) => ({
        id:           s.id,
        name:         s.nome,
        codice:       s.codice,
        imageUrl:     s.immagineUrl || null,
        retailPrice:  s.retailPrice ? Number(s.retailPrice) : null,
        costPrice:    s.costPrice   ? Number(s.costPrice)   : null,
        misura:       s.misura,
        note:         s.note,
        colore:       s.tono ? (s.tono === 'chiaro' ? 'Legno chiaro' : 'Legno scuro') : null,
        linkAcquisto: s.linkAcquisto,
        tipo:         s.tipo,
        tipoLabel:    LABEL_SUPPORTO[s.tipo as keyof typeof LABEL_SUPPORTO],
      })),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
