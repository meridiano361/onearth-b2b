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

// ── New typography types ──────────────────────────────────────────────────────

export type FieldStyle = {
  fontSize: number;
  bold: boolean;
  italic: boolean;
  color: string;
  align: 'left' | 'center' | 'right';
  uppercase: boolean;
};

export type CardFieldStyles = {
  codice: FieldStyle;
  descrizione: FieldStyle;
  misure: FieldStyle;
  produttore: FieldStyle;
  paese: FieldStyle;
  prezzoCosto: FieldStyle;
  pvp: FieldStyle;
  linea: FieldStyle;
  collezione: FieldStyle;
  confezione: FieldStyle;
  iva: FieldStyle;
};

export type SeparatorStyle = {
  fontSize: number;
  bold: boolean;
  italic: boolean;
  color: string;
  bgColor: string;
  align: 'left' | 'center' | 'right';
  height: number;
  uppercase: boolean;
};

export type PageHeaderStyle = {
  titleFontSize: number;
  titleBold: boolean;
  titleItalic: boolean;
  titleColor: string;
  titleAlign: 'left' | 'center' | 'right';
  showSeparator: boolean;
  separatorColor: string;
};

export type PageFooterStyle = {
  fontSize: number;
  color: string;
  align: 'left' | 'center' | 'right';
  customText: string;
  showSeparator: boolean;
};

export type CardBoxStyle = {
  borderWidth: number;    // 0, 0.5, 1, 2
  borderColor: string;
  borderRadius: number;   // 0, 4, 8
  padding: number;        // 2, 4, 6, 8
};

export type CoverTypography = {
  titoloFontSize: number;
  titoloBold: boolean;
  titoloItalic: boolean;
  titoloColor: string;
  titoloUppercase: boolean;
  sottotitoloFontSize: number;
  sottotitoloBold: boolean;
  sottotitoloItalic: boolean;
  sottotitoloColor: string;
  bgColor: string;
};

export type FinalPageTypography = {
  titoloFontSize: number;
  titoloBold: boolean;
  titoloItalic: boolean;
  titoloColor: string;
  testoFontSize: number;
  testoColor: string;
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
  // Typography customization
  cardFieldStyles: CardFieldStyles;
  separatoreStyle: SeparatorStyle;
  headerStyle: PageHeaderStyle;
  footerStyle: PageFooterStyle;
  cardBoxStyle: CardBoxStyle;
  copertinaTypo: CoverTypography;
  paginaFinaleTypo: FinalPageTypography;
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

// ── Typography helpers ────────────────────────────────────────────────────────

function fieldFont(fs: FieldStyle): string {
  if (fs.bold && fs.italic) return 'Helvetica-BoldOblique';
  if (fs.bold) return 'Helvetica-Bold';
  if (fs.italic) return 'Helvetica-Oblique';
  return 'Helvetica';
}

type Segment = { text: string; bold: boolean; italic: boolean };

function parseInlineText(raw: string): Segment[] {
  if (!raw) return [];
  const segments: Segment[] = [];
  const re = /(\*\*(.+?)\*\*|\*(.+?)\*|([^*]+))/g;
  let m;
  while ((m = re.exec(raw)) !== null) {
    if (m[2]) segments.push({ text: m[2], bold: true, italic: false });
    else if (m[3]) segments.push({ text: m[3], bold: false, italic: true });
    else if (m[4]) segments.push({ text: m[4], bold: false, italic: false });
  }
  return segments.length > 0 ? segments : [{ text: raw, bold: false, italic: false }];
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

  const TEXT_PAD = config.cardBoxStyle?.padding ?? 4;
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
    letterSpacing: 0.5,
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
    paddingTop: 3,
    alignItems: 'center',
  },
  // Grid
  row: { flexDirection: 'row' },
  // Product card
  cell: {
    overflow: 'hidden',
  },
  textArea: {
    flex: 1,
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
  separatorCount: {
    fontSize: 10,
    textAlign: 'center',
    letterSpacing: 1.5,
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
  const hs = config.headerStyle;
  const borderColor = hs.separatorColor;
  const textColor = hs.titleColor;
  const mutedColor = config.colori.testoSecondario;
  const titleFont = hs.titleBold ? 'Helvetica-Bold' : hs.titleItalic ? 'Helvetica-Oblique' : 'Helvetica';

  return (
    <View
      style={[s.header, {
        borderBottomWidth: hs.showSeparator ? 0.5 : 0,
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
      <Text style={[s.headerTitle, {
        fontSize: hs.titleFontSize,
        fontFamily: titleFont,
        color: textColor,
        textAlign: hs.titleAlign as any,
      }]}>{config.titolo}</Text>
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
  const fs = config.footerStyle;

  return (
    <View
      style={[s.footer, {
        borderTopWidth: fs.showSeparator ? 0.5 : 0,
        borderTopColor: fs.color,
        left: layout.M,
        right: layout.M,
      }]}
      fixed
    >
      <Text
        style={{ fontSize: fs.fontSize, color: fs.color, textAlign: fs.align as any }}
        render={({ pageNumber, totalPages }) =>
          fs.customText
            ? `${fs.customText} — ${pageNumber} / ${totalPages}`
            : `${pageNumber} / ${totalPages}`
        }
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
  const cfs = config.cardFieldStyles;
  const box = config.cardBoxStyle;

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

  const misureStyle = cfs.misure;
  const detailText = misureStyle.uppercase ? detailStr.toUpperCase() : detailStr;

  return (
    <View
      style={[s.cell, {
        width: layout.CARD_W,
        height: layout.CARD_H,
        borderWidth: box.borderWidth,
        borderColor: box.borderColor,
        borderRadius: box.borderRadius,
        backgroundColor: colori.sfondoPagina,
      }]}
    >
      {/* Image area */}
      {f.foto && (
        <View
          style={{
            width: layout.CARD_W - box.borderWidth,
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
                width: layout.CARD_W - box.borderWidth,
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
          padding: box.padding,
          height: layout.TEXT_AREA_H,
        }]}
      >
        {f.codice && (
          <View style={{ height: layout.CODE_H, overflow: 'hidden' }}>
            <Text style={{
              fontSize: cfs.codice.fontSize,
              fontFamily: fieldFont(cfs.codice),
              color: cfs.codice.color,
              textAlign: cfs.codice.align as any,
              letterSpacing: 0.3,
              overflow: 'hidden',
            }}>
              {cfs.codice.uppercase ? product.code.toUpperCase() : product.code}
            </Text>
          </View>
        )}

        {f.descrizione && (
          <View style={{ height: layout.DESC_H, overflow: 'hidden' }}>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Text style={{
              fontSize: cfs.descrizione.fontSize,
              fontFamily: fieldFont(cfs.descrizione),
              color: cfs.descrizione.color,
              textAlign: cfs.descrizione.align as any,
              lineHeight: 1.25,
              overflow: 'hidden',
            }} {...({ numberOfLines: 2 } as any)}>
              {cfs.descrizione.uppercase
                ? (product.description || product.name).toUpperCase()
                : (product.description || product.name)}
            </Text>
          </View>
        )}

        {anyDetail && (
          <View style={{ height: layout.DETAIL_H, overflow: 'hidden' }}>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Text style={{
              fontSize: misureStyle.fontSize,
              fontFamily: fieldFont(misureStyle),
              color: misureStyle.color,
              textAlign: misureStyle.align as any,
              overflow: 'hidden',
            }} {...({ numberOfLines: 1 } as any)}>
              {detailText}
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
                <Text style={[s.priceLabel, { color: cfs.prezzoCosto.color }]}>Costo i.e.</Text>
                <Text style={{
                  fontSize: cfs.prezzoCosto.fontSize,
                  fontFamily: fieldFont(cfs.prezzoCosto),
                  color: cfs.prezzoCosto.color,
                  textAlign: cfs.prezzoCosto.align as any,
                }}>
                  {euro(product.costPrice)}
                </Text>
              </View>
            )}
            {f.pvp && (
              <View style={s.priceItem}>
                <Text style={[s.priceLabel, { color: cfs.pvp.color }]}>PVP i.i.</Text>
                <Text style={{
                  fontSize: cfs.pvp.fontSize,
                  fontFamily: fieldFont(cfs.pvp),
                  color: cfs.pvp.color,
                  textAlign: cfs.pvp.align as any,
                }}>
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
  const typo = config.copertinaTypo;
  const { pageW, pageH } = layout;
  const coverLogoBase64 = resolveCoverLogo(cov, config.logoBase64);
  const logoH = COVER_LOGO_H[cov.logoDimensione] ?? 28;
  const logoJustify = COVER_LOGO_JUSTIFY[cov.logoPosizione] ?? 'center';
  const titleAlign = cov.titoloAllineamento ?? 'center';
  const subtitleAlign = cov.sottotitoloAllineamento ?? 'center';

  const titleFont = (typo.titoloBold && typo.titoloItalic) ? 'Helvetica-BoldOblique'
    : typo.titoloBold ? 'Helvetica-Bold'
    : typo.titoloItalic ? 'Helvetica-Oblique'
    : 'Helvetica';

  const subtitleFont = (typo.sottotitoloBold && typo.sottotitoloItalic) ? 'Helvetica-BoldOblique'
    : typo.sottotitoloBold ? 'Helvetica-Bold'
    : typo.sottotitoloItalic ? 'Helvetica-Oblique'
    : 'Helvetica';

  const titoloText = typo.titoloUppercase ? cov.titolo.toUpperCase() : cov.titolo;

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
              fontSize: typo.titoloFontSize,
              fontFamily: titleFont,
              color: typo.titoloColor,
              letterSpacing: 3,
              marginBottom: 6,
              textAlign: titleAlign,
            }}
          >
            {titoloText}
          </Text>
          {cov.sottotitolo ? (
            <Text style={{
              fontSize: typo.sottotitoloFontSize,
              fontFamily: subtitleFont,
              color: typo.sottotitoloColor,
              letterSpacing: 1,
              opacity: 0.85,
              textAlign: subtitleAlign,
            }}>
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
            backgroundColor: typo.bgColor,
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
              fontSize: typo.titoloFontSize,
              fontFamily: titleFont,
              color: typo.titoloColor,
              letterSpacing: 3,
              textAlign: titleAlign,
              marginBottom: 8,
            }}
          >
            {titoloText}
          </Text>
          {cov.sottotitolo ? (
            <Text
              style={{
                fontSize: typo.sottotitoloFontSize,
                fontFamily: subtitleFont,
                color: typo.sottotitoloColor,
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
        backgroundColor: typo.bgColor,
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
          fontSize: typo.titoloFontSize,
          fontFamily: titleFont,
          color: typo.titoloColor,
          letterSpacing: 4,
          textAlign: titleAlign,
          marginBottom: 12,
        }}
      >
        {titoloText}
      </Text>
      {cov.sottotitolo ? (
        <Text
          style={{
            fontSize: typo.sottotitoloFontSize,
            fontFamily: subtitleFont,
            color: typo.sottotitoloColor,
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
  const typo = config.paginaFinaleTypo;
  const { pageW, pageH } = layout;
  const titleAlign = pf.titoloAllineamento ?? 'center';
  const textAlign = pf.testoAllineamento ?? 'center';

  const titleFont = (typo.titoloBold && typo.titoloItalic) ? 'Helvetica-BoldOblique'
    : typo.titoloBold ? 'Helvetica-Bold'
    : typo.titoloItalic ? 'Helvetica-Oblique'
    : 'Helvetica';

  const segments = pf.testo ? parseInlineText(pf.testo) : [];

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
            fontSize: typo.titoloFontSize,
            fontFamily: titleFont,
            color: typo.titoloColor,
            letterSpacing: 2,
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
            fontSize: typo.testoFontSize,
            color: typo.testoColor,
            textAlign: textAlign,
            lineHeight: 1.6,
            marginBottom: 24,
          }}
        >
          {segments.map((seg, i) => (
            <Text
              key={i}
              style={{
                fontFamily: (seg.bold && seg.italic) ? 'Helvetica-BoldOblique'
                  : seg.bold ? 'Helvetica-Bold'
                  : seg.italic ? 'Helvetica-Oblique'
                  : 'Helvetica',
              }}
            >
              {seg.text}
            </Text>
          ))}
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
  const sep = config.separatoreStyle;
  const sepFont = (sep.bold && sep.italic) ? 'Helvetica-BoldOblique'
    : sep.bold ? 'Helvetica-Bold'
    : sep.italic ? 'Helvetica-Oblique'
    : 'Helvetica';
  const displayKey = sep.uppercase ? groupKey.toUpperCase() : groupKey;

  return (
    <Page
      size={[pageW, pageH] as [number, number]}
      style={[s.separatorPage, { backgroundColor: sep.bgColor }]}
    >
      <CatalogHeader config={config} today={today} layout={layout} />
      <View style={s.separatorContent}>
        <View style={[s.separatorAccentLine, { backgroundColor: sep.color }]} />
        <Text style={{
          fontSize: sep.fontSize,
          fontFamily: sepFont,
          color: sep.color,
          letterSpacing: 3,
          textAlign: sep.align as any,
          marginBottom: 12,
        }}>
          {displayKey}
        </Text>
        <Text style={[s.separatorCount, { color: sep.color }]}>
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
  const sep = config.separatoreStyle;
  const inlineH = Math.max(10, Math.round(sep.height / 2));
  const sepFont = (sep.bold && sep.italic) ? 'Helvetica-BoldOblique'
    : sep.bold ? 'Helvetica-Bold'
    : sep.italic ? 'Helvetica-Oblique'
    : 'Helvetica';
  const displayKey = sep.uppercase ? groupKey.toUpperCase() : groupKey;

  return (
    <View
      style={{
        height: inlineH,
        justifyContent: 'center',
        paddingHorizontal: 6,
        backgroundColor: sep.bgColor,
        width: layout.CARD_W * layout.COLS,
      }}
    >
      <Text style={{
        fontSize: Math.max(6, sep.fontSize * 0.6),
        fontFamily: sepFont,
        color: sep.color,
        letterSpacing: 1,
        textAlign: sep.align as any,
      }}>
        {displayKey}
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
  const sep = config.separatoreStyle;
  const sepFont = (sep.bold && sep.italic) ? 'Helvetica-BoldOblique'
    : sep.bold ? 'Helvetica-Bold'
    : sep.italic ? 'Helvetica-Oblique'
    : 'Helvetica';
  const displayKey = sep.uppercase ? groupKey.toUpperCase() : groupKey;

  return (
    <View
      style={{
        height: sep.height,
        justifyContent: 'center',
        paddingHorizontal: 8,
        backgroundColor: sep.bgColor,
        borderBottomWidth: 1,
        borderBottomColor: sep.color,
        width: layout.CARD_W * layout.COLS,
        marginTop: 6,
      }}
    >
      <Text style={{
        fontSize: sep.fontSize,
        fontFamily: sepFont,
        color: sep.color,
        letterSpacing: 1.5,
        textAlign: sep.align as any,
      }}>
        {displayKey}
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
