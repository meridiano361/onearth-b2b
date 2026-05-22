import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { prisma } from '@/lib/prisma';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

async function translateDescription(testo: string): Promise<{
  en: string; de: string; fr: string; es: string;
}> {
  if (!ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY non configurata');

  const prompt = `Traduci la seguente descrizione di un prodotto di abbigliamento/accessori in inglese, tedesco, francese e spagnolo. Rispondi SOLO con un JSON valido nel formato:
{"en":"...","de":"...","fr":"...","es":"..."}

Descrizione italiana: ${testo}`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic API error: ${err}`);
  }

  const data = await res.json();
  const text = data.content?.[0]?.text ?? '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('JSON non trovato nella risposta');
  return JSON.parse(jsonMatch[0]);
}

// POST /api/admin/products/translate
// Body: { productId: string } | { all: true }
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();

  if (body.all) {
    // Traduci tutti i prodotti con descrizione italiana non ancora tradotti
    const products = await prisma.product.findMany({
      where: {
        description: { not: null },
        descrizioneEn: null,
      },
      select: { id: true, description: true },
    });

    let done = 0;
    const errors: string[] = [];
    for (const p of products) {
      try {
        const trad = await translateDescription(p.description!);
        await prisma.product.update({
          where: { id: p.id },
          data: {
            descrizioneEn: trad.en,
            descrizioneDe: trad.de,
            descrizioneFr: trad.fr,
            descrizioneEs: trad.es,
          },
        });
        done++;
      } catch (e: any) {
        errors.push(`${p.id}: ${e.message}`);
      }
    }
    return NextResponse.json({ done, errors });
  }

  const { productId } = body;
  if (!productId) return NextResponse.json({ error: 'productId required' }, { status: 400 });

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const testo = product.description || product.name;
  const trad = await translateDescription(testo);

  await prisma.product.update({
    where: { id: productId },
    data: {
      descrizioneEn: trad.en,
      descrizioneDe: trad.de,
      descrizioneFr: trad.fr,
      descrizioneEs: trad.es,
    },
  });

  return NextResponse.json({ ok: true, translations: trad });
}
