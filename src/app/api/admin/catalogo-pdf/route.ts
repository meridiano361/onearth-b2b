import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { CatalogoPDFDocument } from '@/components/admin/CatalogoPDFDocument';
import type { CatalogConfig, CatalogFields, GroupForPDF, ProductForPDF } from '@/components/admin/CatalogoPDFDocument';

const SORT_MAP: Record<string, any> = {
  code: [{ code: 'asc' }],
  name: [{ name: 'asc' }],
  costPrice_asc: [{ costPrice: 'asc' }],
  costPrice_desc: [{ costPrice: 'desc' }],
  nomLinea: [{ nomLinea: 'asc' }, { code: 'asc' }],
  collezione: [{ collezione: 'asc' }, { code: 'asc' }],
};

const RAGGRUPPAMENTO_FIELD: Record<string, keyof ProductForPDF> = {
  nomLinea: 'nomLinea',
  classe: 'classe',
  sottoclasse: 'sottoclasse',
  famiglia: 'famiglia',
  gruppoOmogeneo: 'gruppoOmogeneo',
  collezione: 'collezione',
  produttore: 'produttore',
  paese: 'paese',
};

async function fetchImageAsJpegBase64(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8_000);
    const res = await fetch(url, { signal: controller.signal, cache: 'no-store' });
    clearTimeout(timer);
    if (!res.ok) return null;
    const raw = Buffer.from(await res.arrayBuffer());
    if (raw.length === 0) return null;
    const jpg = await sharp(raw).jpeg({ quality: 80 }).toBuffer();
    return `data:image/jpeg;base64,${jpg.toString('base64')}`;
  } catch {
    return null;
  }
}

function readLogoBase64(): string | null {
  try {
    const logoPath = path.join(process.cwd(), 'public', 'logo-on-earth', 'onearth_solo.png');
    const buf = fs.readFileSync(logoPath);
    return `data:image/png;base64,${buf.toString('base64')}`;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const role = session.user.role;
    if (role !== 'SUPER_ADMIN' && role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const sp = req.nextUrl.searchParams;

    // Filters
    const where: any = {};
    if (sp.get('soloAttivi') !== 'false') where.isActive = true;
    const filterFields = [
      'gruppoMerceologico', 'famiglia', 'classe', 'sottoclasse',
      'gruppoOmogeneo', 'nomLinea', 'collezione', 'colore',
      'produttore', 'tranche',
    ] as const;
    for (const f of filterFields) {
      const v = sp.get(f);
      if (v) where[f] = v;
    }

    // Sort
    const ordinaKey = sp.get('ordina') || 'code';
    const orderBy = SORT_MAP[ordinaKey] ?? SORT_MAP.code;

    // Fields config
    const campiRaw = sp.get('campi');
    const campi: CatalogFields = campiRaw
      ? JSON.parse(campiRaw)
      : {
          foto: true, codice: true, descrizione: true, misure: true,
          produttore: true, paese: true, prezzoCosto: true, pvp: true,
          linea: false, collezione: false, confezione: false, iva: false,
        };

    const titolo = sp.get('titolo') || 'Catalogo ON EARTH';
    const mostraLogo = sp.get('mostraLogo') !== 'false';
    const mostraData = sp.get('mostraData') !== 'false';
    const mostraPagina = sp.get('mostraPagina') !== 'false';
    const raggruppa = sp.get('raggruppa') || '';

    // Fetch products
    const products = await prisma.product.findMany({
      where,
      orderBy,
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        costPrice: true,
        retailPrice: true,
        lotSize: true,
        imageUrl: true,
        misura: true,
        produttore: true,
        paese: true,
        nomLinea: true,
        collezione: true,
        iva: true,
        classe: true,
        sottoclasse: true,
        famiglia: true,
        gruppoOmogeneo: true,
      },
    });

    if (products.length === 0) {
      return NextResponse.json({ error: 'Nessun prodotto trovato con i filtri selezionati' }, { status: 404 });
    }

    // Download images concurrently (max 20 at a time to avoid overloading)
    const BATCH = 20;
    const imageMap = new Map<string, string | null>();
    if (campi.foto) {
      for (let i = 0; i < products.length; i += BATCH) {
        const slice = products.slice(i, i + BATCH);
        const results = await Promise.all(
          slice.map((p) => (p.imageUrl ? fetchImageAsJpegBase64(p.imageUrl) : Promise.resolve(null)))
        );
        slice.forEach((p, j) => imageMap.set(p.id, results[j]));
      }
    }

    const logoBase64 = mostraLogo ? readLogoBase64() : null;

    // Build ProductForPDF array
    const productsForPDF: ProductForPDF[] = products.map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      description: p.description,
      costPrice: Number(p.costPrice),
      retailPrice: Number(p.retailPrice),
      lotSize: p.lotSize,
      misura: p.misura,
      produttore: p.produttore,
      paese: p.paese,
      nomLinea: p.nomLinea,
      collezione: p.collezione,
      iva: p.iva,
      imageDataUri: imageMap.get(p.id) ?? null,
      classe: p.classe,
      sottoclasse: p.sottoclasse,
      famiglia: p.famiglia,
      gruppoOmogeneo: p.gruppoOmogeneo,
    }));

    // Build groups
    let groups: GroupForPDF[];
    const groupField = RAGGRUPPAMENTO_FIELD[raggruppa];
    if (raggruppa && groupField) {
      const map = new Map<string, ProductForPDF[]>();
      for (const p of productsForPDF) {
        const key = (p[groupField] as string | null) || 'Non specificato';
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(p);
      }
      groups = Array.from(map.entries())
        .sort(([a], [b]) => a.localeCompare(b, 'it'))
        .map(([key, prods]) => ({ key, products: prods }));
    } else {
      groups = [{ key: '', products: productsForPDF }];
    }

    const config: CatalogConfig = {
      titolo,
      mostraLogo,
      mostraData,
      mostraPagina,
      raggruppa,
      campi,
      logoBase64,
    };

    const pdfBuffer = await renderToBuffer(
      React.createElement(CatalogoPDFDocument, { groups, config }) as any
    );

    const dateStr = new Date().toISOString().slice(0, 10);
    const filterLabel = raggruppa || 'completo';
    const filename = `Catalogo-ON-EARTH-${dateStr}-${filterLabel}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error('[catalogo-pdf]', err);
    return NextResponse.json({ error: 'Errore nella generazione del PDF' }, { status: 500 });
  }
}
