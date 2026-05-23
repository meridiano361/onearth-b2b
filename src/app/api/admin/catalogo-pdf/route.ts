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
import type { CatalogConfig, CatalogFields, GroupForPDF, ProductForPDF, CustomSection } from '@/components/admin/CatalogoPDFDocument';

function productMatchesSection(product: ProductForPDF, criteri: CustomSection['criteri']): boolean {
  const checks = [
    criteri.classe.length > 0 && criteri.classe.includes(product.classe ?? ''),
    criteri.sottoclasse.length > 0 && criteri.sottoclasse.includes(product.sottoclasse ?? ''),
    criteri.famiglia.length > 0 && criteri.famiglia.includes(product.famiglia ?? ''),
    criteri.gruppoOmogeneo.length > 0 && criteri.gruppoOmogeneo.includes(product.gruppoOmogeneo ?? ''),
    criteri.nomLinea.length > 0 && criteri.nomLinea.includes(product.nomLinea ?? ''),
    criteri.colore.length > 0 && criteri.colore.includes((product as any).colore ?? ''),
    criteri.produttore.length > 0 && criteri.produttore.includes(product.produttore ?? ''),
  ];
  return checks.some(Boolean);
}

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

// ── Shared product fetching logic ─────────────────────────────────────────────

interface FetchProductsOptions {
  where: any;
  orderBy: any;
  campi: CatalogFields;
  raggruppa: string;
  mostraLogo: boolean;
  coverImgBase64?: string | null;
}

async function buildGroupsAndConfig(opts: FetchProductsOptions & {
  titolo: string;
  mostraData: boolean;
  mostraPagina: boolean;
  fullConfig?: Partial<CatalogConfig>;
}): Promise<{ groups: GroupForPDF[]; config: CatalogConfig }> {
  const { where, orderBy, campi, raggruppa, mostraLogo, coverImgBase64, titolo, mostraData, mostraPagina, fullConfig } = opts;

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
    throw new Error('Nessun prodotto trovato con i filtri selezionati');
  }

  // Download images concurrently (max 20 at a time)
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

  // ITEM 6D: Custom sections logic
  if (fullConfig?.useSezioniPersonalizzate && fullConfig.sezioniPersonalizzate && fullConfig.sezioniPersonalizzate.length > 0) {
    const customGroups: GroupForPDF[] = [];
    const assignedIds = new Set<string>();

    const sectionSortMap: Record<string, (a: ProductForPDF, b: ProductForPDF) => number> = {
      code: (a, b) => a.code.localeCompare(b.code),
      name: (a, b) => (a.name || '').localeCompare(b.name || ''),
      costPrice_asc: (a, b) => a.costPrice - b.costPrice,
      costPrice_desc: (a, b) => b.costPrice - a.costPrice,
      nomLinea: (a, b) => (a.nomLinea || '').localeCompare(b.nomLinea || ''),
    };

    for (const sezione of fullConfig.sezioniPersonalizzate) {
      const sectionProducts = productsForPDF
        .filter((p) => productMatchesSection(p, sezione.criteri))
        .sort(sectionSortMap[sezione.ordinamento] ?? sectionSortMap.code);

      sectionProducts.forEach((p) => assignedIds.add(p.id));

      if (sezione.mostraSottosezioni) {
        // Group by the most specific criterion available
        const subMap = new Map<string, ProductForPDF[]>();
        for (const p of sectionProducts) {
          const subKey = p.sottoclasse || p.classe || p.famiglia || p.gruppoOmogeneo || p.nomLinea || 'Non specificato';
          if (!subMap.has(subKey)) subMap.set(subKey, []);
          subMap.get(subKey)!.push(p);
        }
        for (const [subKey, subProducts] of subMap.entries()) {
          customGroups.push({ key: `${sezione.nome} — ${subKey}`, products: subProducts });
        }
      } else {
        if (sectionProducts.length > 0) {
          customGroups.push({ key: sezione.nome, products: sectionProducts });
        }
      }
    }

    if (fullConfig.includiProdottiNonAssegnati !== false) {
      const unassigned = productsForPDF.filter((p) => !assignedIds.has(p.id));
      if (unassigned.length > 0) {
        customGroups.push({ key: 'Altri prodotti', products: unassigned });
      }
    }

    groups = customGroups;
  } else {
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
  }

  const config: CatalogConfig = {
    titolo,
    mostraLogo,
    mostraData,
    mostraPagina,
    raggruppa,
    campi,
    logoBase64,
    // New fields with defaults (can be overridden by fullConfig)
    formato: fullConfig?.formato ?? 'A4-P',
    colonne: fullConfig?.colonne ?? 4,
    righe: fullConfig?.righe ?? 6,
    margine: fullConfig?.margine ?? 'normale',
    colori: fullConfig?.colori ?? {
      sfondoPagina: '#E8DDD0',
      sfondoFoto: '#FFFFFF',
      testoPrimario: '#1C1C1C',
      testoSecondario: '#9CA3AF',
    },
    modalitaSeparatore: fullConfig?.modalitaSeparatore ?? 'pagina-intera',
    useSezioniPersonalizzate: fullConfig?.useSezioniPersonalizzate ?? false,
    sezioniPersonalizzate: fullConfig?.sezioniPersonalizzate ?? [],
    includiProdottiNonAssegnati: fullConfig?.includiProdottiNonAssegnati ?? true,
    copertina: fullConfig?.copertina ?? {
      attiva: false,
      immagineBase64: null,
      titolo: '',
      sottotitolo: '',
      layout: 'full-overlay',
      logoTipo: 'onearth',
      logoCustomBase64: null,
      logoPosX: 'left',
      logoPosY: 'top',
      logoPosizione: 'top-left',
      logoDimensione: 'medio',
      titoloAllineamento: 'center',
      sottotitoloAllineamento: 'center',
      imgOffsetX: 0,
      imgOffsetY: 0,
      imgScale: 100,
      imgOpacity: 100,
    },
    paginaFinale: fullConfig?.paginaFinale ?? {
      attiva: false,
      titolo: '',
      testo: '',
      mostraLogo: true,
      titoloAllineamento: 'center',
      testoAllineamento: 'center',
    },
    cardFieldStyles: fullConfig?.cardFieldStyles ?? {
      codice:      { fontSize: 6.5, bold: false, italic: false, color: '#9CA3AF', align: 'left', uppercase: false },
      descrizione: { fontSize: 7,   bold: false, italic: false, color: '#1C1C1C', align: 'left', uppercase: false },
      misure:      { fontSize: 6.5, bold: false, italic: false, color: '#9CA3AF', align: 'left', uppercase: false },
      produttore:  { fontSize: 6.5, bold: false, italic: false, color: '#9CA3AF', align: 'left', uppercase: false },
      paese:       { fontSize: 6.5, bold: false, italic: false, color: '#9CA3AF', align: 'left', uppercase: false },
      prezzoCosto: { fontSize: 8,   bold: false, italic: false, color: '#1C1C1C', align: 'left', uppercase: false },
      pvp:         { fontSize: 8,   bold: false, italic: false, color: '#1C1C1C', align: 'left', uppercase: false },
      linea:       { fontSize: 6.5, bold: false, italic: false, color: '#9CA3AF', align: 'left', uppercase: false },
      collezione:  { fontSize: 6.5, bold: false, italic: false, color: '#9CA3AF', align: 'left', uppercase: false },
      confezione:  { fontSize: 6.5, bold: false, italic: false, color: '#9CA3AF', align: 'left', uppercase: false },
      iva:         { fontSize: 6.5, bold: false, italic: false, color: '#9CA3AF', align: 'left', uppercase: false },
    },
    separatoreStyle: fullConfig?.separatoreStyle ?? {
      fontSize: 16, bold: true, italic: false, color: '#1C1C1C', bgColor: '#E8DDD0',
      align: 'center', height: 36, uppercase: true,
    },
    headerStyle: fullConfig?.headerStyle ?? {
      titleFontSize: 8, titleBold: false, titleItalic: false, titleColor: '#1C1C1C',
      titleAlign: 'center', showSeparator: true, separatorColor: '#D4CEC7',
    },
    footerStyle: fullConfig?.footerStyle ?? {
      fontSize: 6.5, color: '#9CA3AF', align: 'center', customText: '', showSeparator: true,
    },
    cardBoxStyle: fullConfig?.cardBoxStyle ?? {
      borderWidth: 0.5, borderColor: '#D4CEC7', borderRadius: 0, padding: 4,
    },
    copertinaTypo: fullConfig?.copertinaTypo ?? {
      titoloFontSize: 28, titoloBold: true, titoloItalic: false, titoloColor: '#FFFFFF',
      titoloUppercase: true, sottotitoloFontSize: 13, sottotitoloBold: false,
      sottotitoloItalic: false, sottotitoloColor: '#FFFFFF', bgColor: '#E8DDD0',
    },
    paginaFinaleTypo: fullConfig?.paginaFinaleTypo ?? {
      titoloFontSize: 20, titoloBold: true, titoloItalic: false, titoloColor: '#1C1C1C',
      testoFontSize: 10, testoColor: '#9CA3AF',
    },
    paginaPenultima: fullConfig?.paginaPenultima,
    paginaPenultimaTypo: fullConfig?.paginaPenultimaTypo,
    nuovoBadge: fullConfig?.nuovoBadge ?? {
      attivo: true,
      testo: 'NUOVO',
      bgColor: '#000000',
      textColor: '#FFFFFF',
      posizione: 'image-top-right',
    },
  };

  // If a cover image was provided separately (e.g. from GET route), inject it
  if (coverImgBase64 && config.copertina) {
    config.copertina = { ...config.copertina, immagineBase64: coverImgBase64 };
  }

  // If no base64 cover image but a URL is available, fetch and convert it
  if (config.copertina && !config.copertina.immagineBase64 && config.copertina.immagineUrl) {
    const fetched = await fetchImageAsJpegBase64(config.copertina.immagineUrl);
    if (fetched) {
      config.copertina = { ...config.copertina, immagineBase64: fetched };
    }
  }

  // If no base64 final-page image but a URL is available, fetch and convert it
  if (config.paginaFinale && !config.paginaFinale.immagineBase64 && config.paginaFinale.immagineUrl) {
    const fetched = await fetchImageAsJpegBase64(config.paginaFinale.immagineUrl);
    if (fetched) {
      config.paginaFinale = { ...config.paginaFinale, immagineBase64: fetched };
    }
  }

  // If no base64 penultima-page image but a URL is available, fetch and convert it
  if (config.paginaPenultima && !config.paginaPenultima.immagineBase64 && config.paginaPenultima.immagineUrl) {
    const fetched = await fetchImageAsJpegBase64(config.paginaPenultima.immagineUrl);
    if (fetched) {
      config.paginaPenultima = { ...config.paginaPenultima, immagineBase64: fetched };
    }
  }

  return { groups, config };
}

// ── GET — legacy endpoint (query-string based) ─────────────────────────────────

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

    const { groups, config } = await buildGroupsAndConfig({
      where,
      orderBy,
      campi,
      raggruppa,
      mostraLogo,
      titolo,
      mostraData,
      mostraPagina,
    });

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
  } catch (err: any) {
    console.error('[catalogo-pdf GET]', err);
    if (err.message?.includes('Nessun prodotto')) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    return NextResponse.json({ error: 'Errore nella generazione del PDF' }, { status: 500 });
  }
}

// ── POST — full config JSON body ───────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const role = session.user.role;
    if (role !== 'SUPER_ADMIN' && role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();

    // Filters
    const where: any = {};
    if (body.soloAttivi !== false) where.isActive = true;
    const filterFields = [
      'gruppoMerceologico', 'famiglia', 'classe', 'sottoclasse',
      'gruppoOmogeneo', 'nomLinea', 'collezione', 'colore',
      'produttore', 'tranche',
    ] as const;
    for (const f of filterFields) {
      if (body[f]) where[f] = body[f];
    }

    const ordinaKey = body.ordina || 'code';
    const orderBy = SORT_MAP[ordinaKey] ?? SORT_MAP.code;

    const campi: CatalogFields = body.campi ?? {
      foto: true, codice: true, descrizione: true, misure: true,
      produttore: true, paese: true, prezzoCosto: true, pvp: true,
      linea: false, collezione: false, confezione: false, iva: false,
    };

    const raggruppa: string = body.raggruppa || '';
    const mostraLogo: boolean = body.mostraLogo !== false;

    const { groups, config } = await buildGroupsAndConfig({
      where,
      orderBy,
      campi,
      raggruppa,
      mostraLogo,
      titolo: body.titolo || 'Catalogo ON EARTH',
      mostraData: body.mostraData !== false,
      mostraPagina: body.mostraPagina !== false,
      // Pass all new fields through fullConfig
      fullConfig: {
        formato: body.formato,
        colonne: body.colonne,
        righe: body.righe,
        margine: body.margine,
        colori: body.colori,
        modalitaSeparatore: body.modalitaSeparatore,
        copertina: body.copertina,
        paginaFinale: body.paginaFinale,
        paginaPenultima: body.paginaPenultima,
        cardFieldStyles: body.cardFieldStyles,
        separatoreStyle: body.separatoreStyle,
        headerStyle: body.headerStyle,
        footerStyle: body.footerStyle,
        cardBoxStyle: body.cardBoxStyle,
        copertinaTypo: body.copertinaTypo,
        paginaFinaleTypo: body.paginaFinaleTypo,
        paginaPenultimaTypo: body.paginaPenultimaTypo,
        useSezioniPersonalizzate: body.useSezioniPersonalizzate,
        sezioniPersonalizzate: body.sezioniPersonalizzate,
        includiProdottiNonAssegnati: body.includiProdottiNonAssegnati,
        nuovoBadge: body.nuovoBadge,
      },
    });

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
  } catch (err: any) {
    console.error('[catalogo-pdf POST]', err);
    if (err.message?.includes('Nessun prodotto')) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    return NextResponse.json({ error: 'Errore nella generazione del PDF' }, { status: 500 });
  }
}
