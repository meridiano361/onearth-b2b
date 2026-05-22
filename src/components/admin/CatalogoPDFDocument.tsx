import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

// ── Types ─────────────────────────────────────────────────────────────────────

export type CatalogFields = {
  foto: boolean;
  codice: boolean;
  descrizione: boolean;
  misure: boolean;
  produttore: boolean;
  paese: boolean;
  prezzoCosto: boolean;
  pvp: boolean;
  linea: boolean;
  collezione: boolean;
  confezione: boolean;
  iva: boolean;
};

export type CatalogConfig = {
  titolo: string;
  mostraLogo: boolean;
  mostraData: boolean;
  mostraPagina: boolean;
  raggruppa: string;
  campi: CatalogFields;
  logoBase64: string | null;
  // New fields
  formato: 'A4-P' | 'A4-L' | 'A3-P' | 'A3-L';
  colonne: number;
  righe: number;
  margine: 'stretto' | 'normale' | 'ampio';
  colori: {
    sfondoPagina: string;
    sfondoFoto: string;
    testoPrimario: string;
    testoSecondario: string;
  };
  modalitaSeparatore: 'pagina-intera' | 'inline' | 'nuova-riga';
  copertina: {
    attiva: boolean;
    immagineBase64: string | null;
    titolo: string;
    sottotitolo: string;
    layout: 'full-overlay' | 'half' | 'solo-testo';
    logoTipo: 'onearth' | 'custom' | 'none';
    logoCustomBase64: string | null;
    logoPosizione: 'top-left' | 'top-center' | 'top-right';
    logoDimensione: 'piccolo' | 'medio' | 'grande';
    titoloAllineamento: 'left' | 'center' | 'right';
    sottotitoloAllineamento: 'left' | 'center' | 'right';
  };
  paginaFinale: {
    attiva: boolean;
    titolo: string;
    testo: string;
    mostraLogo: boolean;
    titoloAllineamento: 'left' | 'center' | 'right';
    testoAllineamento: 'left' | 'center' | 'right';
  };
};

export type ProductForPDF = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  costPrice: number;
  retailPrice: number;
  lotSize: number;
  misura: string | null;
  produttore: string | null;
  paese: string | null;
  nomLinea: string | null;
  collezione: string | null;
  iva: number;
  imageDataUri: string | null;
  classe: string | null;
  sottoclasse: string | null;
  famiglia: string | null;
  gruppoOmogeneo: string | null;
};

export type GroupForPDF = {
  key: string;
  products: ProductForPDF[];
};

// ── Page size / margin constants ──────────────────────────────────────────────

const PAGE_SIZES: Record<string, [number, number]> = {
  'A4-P': [595, 842],
  'A4-L': [842, 595],
  'A3-P': [842, 1191],
  'A3-L': [1191, 842],
};

const MARGIN_VALUES: Record<string, number> = { stretto: 10, normale: 20, ampio: 30 };

const HEADER_H = 36;
const FOOTER_H = 18;

const COVER_LOGO_H: Record<string, number> = { piccolo: 18, medio: 28, grande: 42 };
const COVER_LOGO_JUSTIFY: Record<string, 'flex-start' | 'center' | 'flex-end'> = {
  'top-left': 'flex-start',
  'top-center': 'center',
  'top-right': 'flex-end',
};

function resolveCoverLogo(cov: CatalogConfig['copertina'], headerLogoBase64: string | null): string | null {
  if (cov.logoTipo === 'none') return null;
  if (cov.logoTipo === 'custom') return cov.logoCustomBase64 ?? null;
  return headerLogoBase64;
}

// ── Layout computation ────────────────────────────────────────────────────────

interface Layout {
  pageW: number;
  pageH: number;
  M: number;
  COLS: number;
  ROWS: number;
  CARD_W: number;
  CARD_H: number;
  IMG_H: number;
  TEXT_AREA_H: number;
  TEXT_PAD: number;
  CODE_H: number;
  DESC_H: number;
  DETAIL_H: number;
  PRICES_H: number;
  SPACER_H: number;
}

function computeLayout(config: CatalogConfig): Layout {
  const [pageW, pageH] = PAGE_SIZES[config.formato] ?? PAGE_SIZES['A4-P'];
  const M = MARGIN_VALUES[config.margine] ?? 20;
  const COLS = Math.max(1, Math.min(6, config.colonne));
  const ROWS = Math.max(1, Math.min(10, config.righe));

  const usableW = pageW - M * 2;
  const usableH = pageH - HEADER_H - FOOTER_H - M * 2;

  const CARD_W = Math.floor(usableW / COLS);
  const CARD_H = Math.floor(usableH / ROWS);

  const f = config.campi;
  const IMG_H = f.foto ? Math.round(CARD_H * 0.56) : 0;

  const TEXT_PAD = 4;
  const CODE_H = 10;
  const DESC_H = 17;
  const DETAIL_H = 10;
  const PRICES_H = 18;

  const TEXT_AREA_H = CARD_H - IMG_H - 2; // 2 for border

  // Calculate which text blocks are enabled
  const anyDetail = f.misure || f.produttore || f.paese || f.linea || f.collezione || f.confezione || f.iva;
  const anyPrice = f.prezzoCosto || f.pvp;

  let usedTextH = TEXT_PAD * 2;
  if (f.codice) usedTextH += CODE_H;
  if (f.descrizione) usedTextH += DESC_H;
  if (anyDetail) usedTextH += DETAIL_H;
  if (anyPrice) usedTextH += PRICES_H;

  const SPACER_H = Math.max(0, TEXT_AREA_H - usedTextH);

  return {
    pageW, pageH, M, COLS, ROWS,
    CARD_W, CARD_H, IMG_H, TEXT_AREA_H,
    TEXT_PAD, CODE_H, DESC_H, DETAIL_H, PRICES_H, SPACER_H,
  };
}

// ── Static styles (non-color, non-size dependent) ─────────────────────────────

const s = StyleSheet.create({
  // Header
  header: {
    position: 'absolute',
    top: 10,
    left: 20,
    right: 20,
    height: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 0.5,
    paddingBottom: 6,
  },
  headerLeft: { width: 100 },
  headerLogo: { height: 14, width: 90 },
  headerBrand: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 2.5,
  },
  headerTitle: {
    fontSize: 8,
    letterSpacing: 0.5,
    textAlign: 'center',
    flex: 1,
    paddingHorizontal: 8,
  },
  headerRight: { width: 100, alignItems: 'flex-end' },
  headerDate: { fontSize: 7 },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 8,
    left: 20,
    right: 20,
    borderTopWidth: 0.5,
    paddingTop: 3,
    alignItems: 'center',
  },
  footerText: { fontSize: 6.5 },
  // Grid
  row: { flexDirection: 'row' },
  // Product card
  cell: {
    borderWidth: 0.5,
    overflow: 'hidden',
  },
  textArea: {
    flex: 1,
    overflow: 'hidden',
  },
  code: {
    fontSize: 6.5,
    letterSpacing: 0.3,
    overflow: 'hidden',
  },
  desc: {
    fontSize: 7,
    lineHeight: 1.25,
    overflow: 'hidden',
  },
  detail: {
    fontSize: 6,
    overflow: 'hidden',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  priceItem: { alignItems: 'flex-start' },
  priceLabel: {
    fontSize: 5.5,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 1,
  },
  priceValue: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
  },
  // Separator page (pagina-intera mode)
  separatorPage: {
    fontFamily: 'Helvetica',
    paddingTop: 20,
    paddingBottom: 20,
    paddingLeft: 20,
    paddingRight: 20,
  },
  separatorContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  separatorAccentLine: {
    width: 50,
    height: 1.5,
    marginBottom: 14,
  },
  separatorTitle: {
    fontSize: 26,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 3,
    textAlign: 'center',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  separatorCount: {
    fontSize: 10,
    textAlign: 'center',
    letterSpacing: 1.5,
  },
  // Inline separator
  inlineHeader: {
    height: 14,
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  inlineHeaderText: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  // New-row separator
  newRowHeader: {
    height: 18,
    justifyContent: 'center',
    paddingHorizontal: 8,
    borderBottomWidth: 1,
  },
  newRowHeaderText: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function euro(n: number) {
  return '€' + n.toFixed(2).replace('.', ',');
}

// ── Sub-components ────────────────────────────────────────────────────────────

function CatalogHeader({
  config,
  today,
  layout,
}: {
  config: CatalogConfig;
  today: string;
  layout: Layout;
}) {
  const borderColor = '#D4CEC7';
  const textColor = config.colori.testoPrimario;
  const mutedColor = config.colori.testoSecondario;

  return (
    <View
      style={[s.header, {
        borderBottomColor: borderColor,
        left: layout.M,
        right: layout.M,
      }]}
      fixed
    >
      <View style={s.headerLeft}>
        {config.mostraLogo && config.logoBase64 ? (
          <Image style={s.headerLogo} src={config.logoBase64} />
        ) : (
          <Text style={[s.headerBrand, { color: textColor }]}>ON EARTH</Text>
        )}
      </View>
      <Text style={[s.headerTitle, { color: textColor }]}>{config.titolo}</Text>
      <View style={s.headerRight}>
        {config.mostraData && (
          <Text style={[s.headerDate, { color: mutedColor }]}>{today}</Text>
        )}
      </View>
    </View>
  );
}

function CatalogFooter({
  config,
  layout,
}: {
  config: CatalogConfig;
  layout: Layout;
}) {
  if (!config.mostraPagina) return null;
  const borderColor = '#D4CEC7';
  const mutedColor = config.colori.testoSecondario;

  return (
    <View
      style={[s.footer, {
        borderTopColor: borderColor,
        left: layout.M,
        right: layout.M,
      }]}
      fixed
    >
      <Text
        style={[s.footerText, { color: mutedColor }]}
        render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
      />
    </View>
  );
}

function ProductCard({
  product,
  config,
  layout,
  isEmpty = false,
}: {
  product?: ProductForPDF;
  config: CatalogConfig;
  layout: Layout;
  isEmpty?: boolean;
}) {
  const f = config.campi;
  const colori = config.colori;

  if (isEmpty || !product) {
    return (
      <View
        style={{
          width: layout.CARD_W,
          height: layout.CARD_H,
          backgroundColor: colori.sfondoPagina,
        }}
      />
    );
  }

  const anyDetail = f.misure || f.produttore || f.paese || f.linea || f.collezione || f.confezione || f.iva;
  const anyPrice = f.prezzoCosto || f.pvp;

  const details: string[] = [];
  if (f.misure && product.misura) details.push(product.misura);
  if (f.produttore && product.produttore) details.push(product.produttore);
  if (f.paese && product.paese) details.push(product.paese);
  if (f.linea && product.nomLinea) details.push(product.nomLinea);
  if (f.collezione && product.collezione) details.push(product.collezione);
  if (f.confezione && product.lotSize > 1) details.push(`Conf. ${product.lotSize}`);
  if (f.iva) details.push(`IVA ${product.iva}%`);
  const detailStr = details.join(' · ');

  return (
    <View
      style={[s.cell, {
        width: layout.CARD_W,
        height: layout.CARD_H,
        borderColor: '#D4CEC7',
        backgroundColor: colori.sfondoPagina,
      }]}
    >
      {/* Image area */}
      {f.foto && (
        <View
          style={{
            width: layout.CARD_W - 1,
            height: layout.IMG_H,
            backgroundColor: colori.sfondoFoto,
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {product.imageDataUri ? (
            <Image
              style={{
                width: layout.CARD_W - 1,
                height: layout.IMG_H,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                objectFit: 'contain' as any,
              }}
              src={product.imageDataUri}
            />
          ) : config.logoBase64 ? (
            <Image
              style={{ width: 55, height: 12, opacity: 0.25 }}
              src={config.logoBase64}
            />
          ) : null}
        </View>
      )}

      {/* Text area */}
      <View
        style={[s.textArea, {
          padding: layout.TEXT_PAD,
          height: layout.TEXT_AREA_H,
        }]}
      >
        {f.codice && (
          <View style={{ height: layout.CODE_H, overflow: 'hidden' }}>
            <Text style={[s.code, { color: colori.testoSecondario }]}>
              {product.code}
            </Text>
          </View>
        )}

        {f.descrizione && (
          <View style={{ height: layout.DESC_H, overflow: 'hidden' }}>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Text style={[s.desc, { color: colori.testoPrimario }]} {...({ numberOfLines: 2 } as any)}>
              {product.description || product.name}
            </Text>
          </View>
        )}

        {anyDetail && (
          <View style={{ height: layout.DETAIL_H, overflow: 'hidden' }}>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Text style={[s.detail, { color: colori.testoSecondario }]} {...({ numberOfLines: 1 } as any)}>
              {detailStr}
            </Text>
          </View>
        )}

        {/* Spacer to push prices to bottom */}
        {layout.SPACER_H > 0 && (
          <View style={{ height: layout.SPACER_H }} />
        )}

        {anyPrice && (
          <View style={[s.priceRow, { height: layout.PRICES_H }]}>
            {f.prezzoCosto && (
              <View style={s.priceItem}>
                <Text style={[s.priceLabel, { color: colori.testoSecondario }]}>Costo i.e.</Text>
                <Text style={[s.priceValue, { color: colori.testoPrimario }]}>
                  {euro(product.costPrice)}
                </Text>
              </View>
            )}
            {f.pvp && (
              <View style={s.priceItem}>
                <Text style={[s.priceLabel, { color: colori.testoSecondario }]}>PVP i.i.</Text>
                <Text style={[s.priceValue, { color: colori.testoPrimario }]}>
                  {euro(product.retailPrice)}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

function ProductGrid({
  products,
  config,
  layout,
}: {
  products: ProductForPDF[];
  config: CatalogConfig;
  layout: Layout;
}) {
  const rows: (ProductForPDF | null)[][] = [];
  for (let i = 0; i < products.length; i += layout.COLS) {
    const row: (ProductForPDF | null)[] = products.slice(i, i + layout.COLS);
    while (row.length < layout.COLS) row.push(null);
    rows.push(row);
  }
  return (
    <View>
      {rows.map((row, ri) => (
        <View key={ri} style={s.row} wrap={false}>
          {row.map((p, ci) =>
            p ? (
              <ProductCard key={p.id} product={p} config={config} layout={layout} />
            ) : (
              <ProductCard key={`e${ci}`} isEmpty config={config} layout={layout} />
            )
          )}
        </View>
      ))}
    </View>
  );
}

// ── Cover page ────────────────────────────────────────────────────────────────

function CoverPage({
  config,
  layout,
}: {
  config: CatalogConfig;
  layout: Layout;
}) {
  const cov = config.copertina;
  const { pageW, pageH } = layout;
  const coverLogoBase64 = resolveCoverLogo(cov, config.logoBase64);
  const logoH = COVER_LOGO_H[cov.logoDimensione] ?? 28;
  const logoJustify = COVER_LOGO_JUSTIFY[cov.logoPosizione] ?? 'center';
  const titleAlign = cov.titoloAllineamento ?? 'center';
  const subtitleAlign = cov.sottotitoloAllineamento ?? 'center';

  if (cov.layout === 'full-overlay') {
    return (
      <Page size={[pageW, pageH] as [number, number]} style={{ fontFamily: 'Helvetica' }}>
        {cov.immagineBase64 && (
          <Image
            src={cov.immagineBase64}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            style={{ position: 'absolute', top: 0, left: 0, width: pageW, height: pageH, objectFit: 'cover' as any }}
          />
        )}

        {/* Logo — top area */}
        {coverLogoBase64 && (
          <View
            style={{
              position: 'absolute',
              top: 28,
              left: 32,
              right: 32,
              flexDirection: 'row',
              justifyContent: logoJustify,
            }}
          >
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Image src={coverLogoBase64} style={{ height: logoH, objectFit: 'contain' as any }} />
          </View>
        )}

        {/* Dark gradient overlay */}
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 160,
            backgroundColor: '#000000',
            opacity: 0.55,
          }}
        />
        {/* Text on top of overlay */}
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 160,
            justifyContent: 'flex-end',
            paddingHorizontal: 40,
            paddingBottom: 44,
          }}
        >
          <Text
            style={{
              fontSize: 28,
              fontFamily: 'Helvetica-Bold',
              color: '#FFFFFF',
              letterSpacing: 3,
              textTransform: 'uppercase',
              marginBottom: 6,
              textAlign: titleAlign,
            }}
          >
            {cov.titolo}
          </Text>
          {cov.sottotitolo ? (
            <Text style={{ fontSize: 13, color: '#FFFFFF', letterSpacing: 1, opacity: 0.85, textAlign: subtitleAlign }}>
              {cov.sottotitolo}
            </Text>
          ) : null}
        </View>
      </Page>
    );
  }

  if (cov.layout === 'half') {
    const halfH = pageH / 2;
    return (
      <Page size={[pageW, pageH] as [number, number]} style={{ fontFamily: 'Helvetica' }}>
        {/* Top half: image */}
        {cov.immagineBase64 ? (
          <Image
            src={cov.immagineBase64}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: pageW,
              height: halfH,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              objectFit: 'cover' as any,
            }}
          />
        ) : (
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: pageW,
              height: halfH,
              backgroundColor: config.colori.sfondoPagina,
            }}
          />
        )}
        {/* Bottom half: logo + title + subtitle */}
        <View
          style={{
            position: 'absolute',
            top: halfH,
            left: 0,
            right: 0,
            bottom: 0,
            justifyContent: 'center',
            backgroundColor: '#FFFFFF',
            paddingHorizontal: 40,
          }}
        >
          {coverLogoBase64 && (
            <View style={{ flexDirection: 'row', justifyContent: logoJustify, marginBottom: 16 }}>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <Image src={coverLogoBase64} style={{ height: logoH, objectFit: 'contain' as any }} />
            </View>
          )}
          <Text
            style={{
              fontSize: 24,
              fontFamily: 'Helvetica-Bold',
              color: config.colori.testoPrimario,
              letterSpacing: 3,
              textTransform: 'uppercase',
              textAlign: titleAlign,
              marginBottom: 8,
            }}
          >
            {cov.titolo}
          </Text>
          {cov.sottotitolo ? (
            <Text
              style={{
                fontSize: 12,
                color: config.colori.testoSecondario,
                letterSpacing: 1,
                textAlign: subtitleAlign,
              }}
            >
              {cov.sottotitolo}
            </Text>
          ) : null}
        </View>
      </Page>
    );
  }

  // solo-testo
  return (
    <Page
      size={[pageW, pageH] as [number, number]}
      style={{
        fontFamily: 'Helvetica',
        backgroundColor: config.colori.sfondoPagina,
        justifyContent: 'center',
        paddingHorizontal: 60,
      }}
    >
      {coverLogoBase64 && (
        <View style={{ flexDirection: 'row', justifyContent: logoJustify, marginBottom: 24 }}>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <Image src={coverLogoBase64} style={{ height: logoH, objectFit: 'contain' as any }} />
        </View>
      )}
      {/* Accent line */}
      <View
        style={{
          width: 50,
          height: 1.5,
          backgroundColor: '#8B7355',
          alignSelf: 'center',
          marginBottom: 20,
        }}
      />
      <Text
        style={{
          fontSize: 26,
          fontFamily: 'Helvetica-Bold',
          color: config.colori.testoPrimario,
          letterSpacing: 4,
          textTransform: 'uppercase',
          textAlign: titleAlign,
          marginBottom: 12,
        }}
      >
        {cov.titolo}
      </Text>
      {cov.sottotitolo ? (
        <Text
          style={{
            fontSize: 13,
            color: config.colori.testoSecondario,
            letterSpacing: 1.5,
            textAlign: subtitleAlign,
          }}
        >
          {cov.sottotitolo}
        </Text>
      ) : null}
    </Page>
  );
}

// ── Final page ────────────────────────────────────────────────────────────────

function FinalPage({
  config,
  layout,
}: {
  config: CatalogConfig;
  layout: Layout;
}) {
  const pf = config.paginaFinale;
  const { pageW, pageH } = layout;
  const titleAlign = pf.titoloAllineamento ?? 'center';
  const textAlign = pf.testoAllineamento ?? 'center';

  return (
    <Page
      size={[pageW, pageH] as [number, number]}
      style={{
        fontFamily: 'Helvetica',
        backgroundColor: config.colori.sfondoPagina,
        justifyContent: 'center',
        paddingHorizontal: 60,
      }}
    >
      {pf.titolo ? (
        <Text
          style={{
            fontSize: 20,
            fontFamily: 'Helvetica-Bold',
            color: config.colori.testoPrimario,
            letterSpacing: 2,
            textTransform: 'uppercase',
            textAlign: titleAlign,
            marginBottom: 18,
          }}
        >
          {pf.titolo}
        </Text>
      ) : null}

      {pf.testo ? (
        <Text
          style={{
            fontSize: 10,
            color: config.colori.testoSecondario,
            textAlign: textAlign,
            lineHeight: 1.6,
            marginBottom: 24,
          }}
        >
          {pf.testo}
        </Text>
      ) : null}

      {pf.mostraLogo && config.logoBase64 && (
        <View style={{ alignItems: 'center' }}>
          <Image src={config.logoBase64} style={{ height: 20, width: 130, marginTop: 10 }} />
        </View>
      )}
    </Page>
  );
}

// ── Separator components ──────────────────────────────────────────────────────

function SeparatorPageFull({
  groupKey,
  productCount,
  config,
  layout,
  today,
}: {
  groupKey: string;
  productCount: number;
  config: CatalogConfig;
  layout: Layout;
  today: string;
}) {
  const { pageW, pageH } = layout;
  return (
    <Page
      size={[pageW, pageH] as [number, number]}
      style={[s.separatorPage, { backgroundColor: config.colori.sfondoPagina }]}
    >
      <CatalogHeader config={config} today={today} layout={layout} />
      <View style={s.separatorContent}>
        <View style={[s.separatorAccentLine, { backgroundColor: '#8B7355' }]} />
        <Text style={[s.separatorTitle, { color: config.colori.testoPrimario }]}>
          {groupKey}
        </Text>
        <Text style={[s.separatorCount, { color: config.colori.testoSecondario }]}>
          {productCount} {productCount === 1 ? 'prodotto' : 'prodotti'}
        </Text>
      </View>
      <CatalogFooter config={config} layout={layout} />
    </Page>
  );
}

function InlineGroupHeader({
  groupKey,
  config,
  layout,
}: {
  groupKey: string;
  config: CatalogConfig;
  layout: Layout;
}) {
  return (
    <View
      style={[s.inlineHeader, {
        backgroundColor: config.colori.sfondoPagina,
        width: layout.CARD_W * layout.COLS,
      }]}
    >
      <Text style={[s.inlineHeaderText, { color: config.colori.testoPrimario }]}>
        {groupKey}
      </Text>
    </View>
  );
}

function NewRowGroupHeader({
  groupKey,
  config,
  layout,
}: {
  groupKey: string;
  config: CatalogConfig;
  layout: Layout;
}) {
  return (
    <View
      style={[s.newRowHeader, {
        backgroundColor: config.colori.sfondoPagina,
        borderBottomColor: '#8B7355',
        width: layout.CARD_W * layout.COLS,
        marginTop: 6,
      }]}
    >
      <Text style={[s.newRowHeaderText, { color: config.colori.testoPrimario }]}>
        {groupKey}
      </Text>
    </View>
  );
}

// ── Main document ─────────────────────────────────────────────────────────────

export interface CatalogoPDFDocumentProps {
  groups: GroupForPDF[];
  config: CatalogConfig;
}

export function CatalogoPDFDocument({ groups, config }: CatalogoPDFDocumentProps) {
  const today = new Date().toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const layout = computeLayout(config);
  const { pageW, pageH } = layout;
  const hasGrouping = !!config.raggruppa;
  const separatorMode = config.modalitaSeparatore ?? 'pagina-intera';

  const pageStyle = {
    fontFamily: 'Helvetica' as const,
    paddingTop: HEADER_H + layout.M,
    paddingBottom: FOOTER_H + layout.M,
    paddingLeft: layout.M,
    paddingRight: layout.M,
    backgroundColor: config.colori.sfondoPagina,
  };

  // Inline / nuova-riga: all groups on continuous pages, no separate separator pages
  const renderInlineOrNewRow = () => {
    const isNewRow = separatorMode === 'nuova-riga';
    return (
      <Page size={[pageW, pageH] as [number, number]} style={pageStyle}>
        <CatalogHeader config={config} today={today} layout={layout} />
        {groups.map((group, gi) => {
          const rows: (ProductForPDF | null)[][] = [];
          for (let i = 0; i < group.products.length; i += layout.COLS) {
            const row: (ProductForPDF | null)[] = group.products.slice(i, i + layout.COLS);
            while (row.length < layout.COLS) row.push(null);
            rows.push(row);
          }

          return (
            <View key={gi}>
              {hasGrouping && (
                isNewRow ? (
                  // Header + first row of products together, no page break between them
                  <View wrap={false}>
                    <NewRowGroupHeader groupKey={group.key} config={config} layout={layout} />
                    {rows[0] && (
                      <View style={s.row}>
                        {rows[0].map((p, ci) =>
                          p ? (
                            <ProductCard key={p.id} product={p} config={config} layout={layout} />
                          ) : (
                            <ProductCard key={`e${ci}`} isEmpty config={config} layout={layout} />
                          )
                        )}
                      </View>
                    )}
                  </View>
                ) : (
                  // inline mode
                  <View wrap={false}>
                    <InlineGroupHeader groupKey={group.key} config={config} layout={layout} />
                    {rows[0] && (
                      <View style={s.row}>
                        {rows[0].map((p, ci) =>
                          p ? (
                            <ProductCard key={p.id} product={p} config={config} layout={layout} />
                          ) : (
                            <ProductCard key={`e${ci}`} isEmpty config={config} layout={layout} />
                          )
                        )}
                      </View>
                    )}
                  </View>
                )
              )}
              {/* Remaining rows (from index 1 onward) */}
              {rows.slice(hasGrouping ? 1 : 0).map((row, ri) => (
                <View key={ri} style={s.row} wrap={false}>
                  {row.map((p, ci) =>
                    p ? (
                      <ProductCard key={p.id} product={p} config={config} layout={layout} />
                    ) : (
                      <ProductCard key={`e${ci}`} isEmpty config={config} layout={layout} />
                    )
                  )}
                </View>
              ))}
              {!hasGrouping && (
                <ProductGrid products={group.products} config={config} layout={layout} />
              )}
            </View>
          );
        })}
        <CatalogFooter config={config} layout={layout} />
      </Page>
    );
  };

  return (
    <Document>
      {/* Cover page */}
      {config.copertina.attiva && (
        <CoverPage config={config} layout={layout} />
      )}

      {/* Product pages */}
      {separatorMode === 'pagina-intera' ? (
        groups.map((group, gi) => (
          <React.Fragment key={gi}>
            {hasGrouping && (
              <SeparatorPageFull
                groupKey={group.key}
                productCount={group.products.length}
                config={config}
                layout={layout}
                today={today}
              />
            )}
            <Page size={[pageW, pageH] as [number, number]} style={pageStyle}>
              <CatalogHeader config={config} today={today} layout={layout} />
              <ProductGrid products={group.products} config={config} layout={layout} />
              <CatalogFooter config={config} layout={layout} />
            </Page>
          </React.Fragment>
        ))
      ) : (
        renderInlineOrNewRow()
      )}

      {/* Final page */}
      {config.paginaFinale.attiva && (
        <FinalPage config={config} layout={layout} />
      )}
    </Document>
  );
}
