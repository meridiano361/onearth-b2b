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

export type CustomSection = {
  id: string;
  nome: string;
  descrizione?: string;
  criteri: {
    classe: string[];
    sottoclasse: string[];
    famiglia: string[];
    gruppoOmogeneo: string[];
    nomLinea: string[];
    colore: string[];
    produttore: string[];
  };
  mostraSottosezioni: boolean;
  ordinamento: 'code' | 'name' | 'costPrice_asc' | 'costPrice_desc' | 'nomLinea';
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
  // Custom sections
  useSezioniPersonalizzate?: boolean;
  sezioniPersonalizzate?: CustomSection[];
  includiProdottiNonAssegnati?: boolean;
  copertina: {
    attiva: boolean;
    immagineBase64: string | null;
    immagineUrl?: string | null; // persisted URL of uploaded cover image
    titolo: string;
    sottotitolo: string;
    layout: 'full-overlay' | 'half' | 'solo-testo';
    logoTipo: 'onearth' | 'custom' | 'none';
    logoCustomBase64: string | null;
    // New grid-style logo position
    logoPosX?: 'left' | 'center' | 'right';
    logoPosY?: 'top' | 'middle' | 'bottom';
    // Legacy (kept for backward compat)
    logoPosizione: 'top-left' | 'top-center' | 'top-right';
    logoDimensione: 'piccolo' | 'medio' | 'grande';
    titoloAllineamento: 'left' | 'center' | 'right';
    sottotitoloAllineamento: 'left' | 'center' | 'right';
    // Image position/scale/opacity controls
    imgOffsetX?: number;
    imgOffsetY?: number;
    imgScale?: number;
    imgOpacity?: number;
  };
  paginaFinale: {
    attiva: boolean;
    titolo: string;
    testo: string;
    mostraLogo: boolean;
    titoloAllineamento: 'left' | 'center' | 'right';
    testoAllineamento: 'left' | 'center' | 'right';
    immagineUrl?: string | null;
    immagineBase64?: string | null;
    immaginePosition?: 'top' | 'center' | 'bottom' | 'background';
    immagineDimensione?: 'small' | 'medium' | 'large' | 'full';
    imgOffsetX?: number;
    imgOffsetY?: number;
    imgScale?: number;
    imgOpacity?: number;
    layout?: 'full-overlay' | 'img-top' | 'img-bottom' | 'img-left' | 'background' | 'img-only';
    logoTipo?: 'onearth' | 'custom' | 'none';
    logoCustomBase64?: string | null;
    logoPosX?: 'left' | 'center' | 'right';
    logoPosY?: 'top' | 'middle' | 'bottom';
    logoDimensione?: 'piccolo' | 'medio' | 'grande';
  };
  // Typography customization
  cardFieldStyles: CardFieldStyles;
  separatoreStyle: SeparatorStyle;
  headerStyle: PageHeaderStyle;
  footerStyle: PageFooterStyle;
  cardBoxStyle: CardBoxStyle;
  copertinaTypo: CoverTypography;
  paginaFinaleTypo: FinalPageTypography;
  nuovoBadge?: {
    attivo: boolean;
    testo: string;
    bgColor: string;
    textColor: string;
    posizione: 'image-top-right' | 'next-to-code';
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

// ── ITEM 1 helper ─────────────────────────────────────────────────────────────

function alignToFlex(align: 'left' | 'center' | 'right'): 'flex-start' | 'center' | 'flex-end' {
  if (align === 'center') return 'center';
  if (align === 'right') return 'flex-end';
  return 'flex-start';
}

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

// ── HTML → react-pdf parser ────────────────────────────────────────────────────

type HtmlInline = { text: string; bold: boolean; italic: boolean };
type HtmlBlock =
  | { type: 'paragraph' | 'h1' | 'h2'; align: 'left' | 'center' | 'right'; inlines: HtmlInline[] }
  | { type: 'bullet' | 'ordered'; items: HtmlInline[][] };

function decodeHtmlEntities(s: string): string {
  return s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function extractAlignFromStyle(attrs: string): 'left' | 'center' | 'right' {
  const m = attrs.match(/text-align\s*:\s*(left|center|right)/);
  return (m?.[1] as 'left' | 'center' | 'right') ?? 'left';
}

function parseHtmlInlines(inner: string): HtmlInline[] {
  const result: HtmlInline[] = [];
  const re = /<(strong|em|b|i|u|s)>([\s\S]*?)<\/\1>|([^<]+)|<[^>]+>/g;
  let m;
  while ((m = re.exec(inner)) !== null) {
    if (m[1]) {
      const tag = m[1].toLowerCase();
      const text = decodeHtmlEntities(m[2].replace(/<[^>]+>/g, ''));
      if (text) result.push({ text, bold: tag === 'strong' || tag === 'b', italic: tag === 'em' || tag === 'i' });
    } else if (m[3]) {
      const text = decodeHtmlEntities(m[3]);
      if (text.trim() || text === ' ') result.push({ text, bold: false, italic: false });
    }
  }
  return result;
}

function parseHtmlToPdf(html: string): HtmlBlock[] {
  if (!html || html.trim() === '' || html.trim() === '<p></p>') return [];
  const blocks: HtmlBlock[] = [];
  const blockRe = /<(p|h1|h2)([^>]*)>([\s\S]*?)<\/\1>|<(ul|ol)>([\s\S]*?)<\/\4>/gi;
  let m;
  while ((m = blockRe.exec(html)) !== null) {
    if (m[1]) {
      const tag = m[1].toLowerCase();
      const inner = (m[3] ?? '').replace(/<br\s*\/?>/gi, '\n');
      const align = extractAlignFromStyle(m[2] ?? '');
      const inlines = parseHtmlInlines(inner);
      if (inlines.length > 0) {
        blocks.push({
          type: tag === 'h1' ? 'h1' : tag === 'h2' ? 'h2' : 'paragraph',
          align,
          inlines,
        });
      }
    } else if (m[4]) {
      const listTag = m[4].toLowerCase();
      const items: HtmlInline[][] = [];
      const liRe = /<li[^>]*>([\s\S]*?)<\/li>/gi;
      let li;
      while ((li = liRe.exec(m[5] ?? '')) !== null) {
        const item = parseHtmlInlines(li[1]);
        if (item.length > 0) items.push(item);
      }
      if (items.length > 0) blocks.push({ type: listTag === 'ul' ? 'bullet' : 'ordered', items });
    }
  }
  if (blocks.length === 0) {
    const plain = html.replace(/<[^>]+>/g, '').trim();
    if (plain) blocks.push({ type: 'paragraph', align: 'left', inlines: [{ text: plain, bold: false, italic: false }] });
  }
  return blocks;
}

function getBlockAlign(block: HtmlBlock, defaultAlign: 'left' | 'center' | 'right'): 'left' | 'center' | 'right' {
  if (block.type === 'paragraph' || block.type === 'h1' || block.type === 'h2') {
    return block.align !== 'left' ? block.align : defaultAlign;
  }
  return defaultAlign;
}

function renderHtmlBlocks(
  blocks: HtmlBlock[],
  opts: { fontSize: number; color: string; defaultAlign: 'left' | 'center' | 'right' },
): React.ReactNode[] {
  const { fontSize, color, defaultAlign } = opts;
  return blocks.map((block, i) => {
    const blockAlign = getBlockAlign(block, defaultAlign);

    const inlineText = (inlines: HtmlInline[]) =>
      inlines.map((seg, j) => (
        <Text key={j} style={{
          fontFamily: (seg.bold && seg.italic) ? 'Helvetica-BoldOblique' : seg.bold ? 'Helvetica-Bold' : seg.italic ? 'Helvetica-Oblique' : 'Helvetica',
        }}>{seg.text}</Text>
      ));

    if (block.type === 'paragraph') {
      return (
        <View key={i} style={{ width: '100%', alignItems: alignToFlex(blockAlign), marginBottom: 3 }}>
          <Text style={{ fontSize, color, lineHeight: 1.6 }}>{inlineText(block.inlines)}</Text>
        </View>
      );
    }
    if (block.type === 'h1') {
      return (
        <View key={i} style={{ width: '100%', alignItems: alignToFlex(blockAlign), marginBottom: 6 }}>
          <Text style={{ fontSize: fontSize * 1.6, fontFamily: 'Helvetica-Bold', color, lineHeight: 1.4 }}>{inlineText(block.inlines)}</Text>
        </View>
      );
    }
    if (block.type === 'h2') {
      return (
        <View key={i} style={{ width: '100%', alignItems: alignToFlex(blockAlign), marginBottom: 4 }}>
          <Text style={{ fontSize: fontSize * 1.3, fontFamily: 'Helvetica-Bold', color, lineHeight: 1.4 }}>{inlineText(block.inlines)}</Text>
        </View>
      );
    }
    if (block.type === 'bullet' || block.type === 'ordered') {
      return (
        <View key={i} style={{ width: '100%', marginBottom: 3 }}>
          {block.items.map((item, j) => (
            <View key={j} style={{ flexDirection: 'row', marginBottom: 2 }}>
              <View style={{ width: 12 }}>
                <Text style={{ fontSize, color }}>{block.type === 'bullet' ? '•' : `${j + 1}.`}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize, color, lineHeight: 1.6 }}>{inlineText(item)}</Text>
              </View>
            </View>
          ))}
        </View>
      );
    }
    return null;
  });
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
  priceItem: { flex: 1 },
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
      <View style={{ flex: 1, paddingHorizontal: 8, alignItems: alignToFlex(hs.titleAlign) }}>
        <Text style={{ fontSize: hs.titleFontSize, fontFamily: titleFont, color: textColor, letterSpacing: 0.5 }}>
          {config.titolo}
        </Text>
      </View>
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
      <View style={{ width: '100%', alignItems: alignToFlex(fs.align) }}>
        <Text
          style={{ fontSize: fs.fontSize, color: fs.color }}
          render={({ pageNumber, totalPages }) =>
            fs.customText
              ? `${fs.customText} — ${pageNumber} / ${totalPages}`
              : `${pageNumber} / ${totalPages}`
          }
        />
      </View>
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

          {/* NUOVO badge — image-top-right position */}
          {config.nuovoBadge?.attivo && product.collezione === 'CA27' && config.nuovoBadge.posizione === 'image-top-right' && (
            <View style={{ position: 'absolute', top: 4, right: 4, backgroundColor: config.nuovoBadge.bgColor, paddingHorizontal: 4, paddingVertical: 2, borderRadius: 3 }}>
              <Text style={{ fontSize: 5, color: config.nuovoBadge.textColor, fontFamily: 'Helvetica-Bold' }}>
                {config.nuovoBadge.testo}
              </Text>
            </View>
          )}
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
          <View style={{ height: layout.CODE_H, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            <Text style={{
              fontSize: cfs.codice.fontSize,
              fontFamily: fieldFont(cfs.codice),
              color: cfs.codice.color,
              letterSpacing: 0.3,
              overflow: 'hidden',
            }}>
              {cfs.codice.uppercase ? product.code.toUpperCase() : product.code}
            </Text>
            {/* NUOVO badge — next-to-code position */}
            {config.nuovoBadge?.attivo && product.collezione === 'CA27' && config.nuovoBadge.posizione === 'next-to-code' && (
              <View style={{ backgroundColor: config.nuovoBadge.bgColor, paddingHorizontal: 3, paddingVertical: 1, borderRadius: 2 }}>
                <Text style={{ fontSize: 4.5, color: config.nuovoBadge.textColor, fontFamily: 'Helvetica-Bold' }}>
                  {config.nuovoBadge.testo}
                </Text>
              </View>
            )}
          </View>
        )}

        {f.descrizione && (
          <View style={{ height: layout.DESC_H, overflow: 'hidden', alignItems: alignToFlex(cfs.descrizione.align) }}>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Text style={{
              fontSize: cfs.descrizione.fontSize,
              fontFamily: fieldFont(cfs.descrizione),
              color: cfs.descrizione.color,
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
          <View style={{ height: layout.DETAIL_H, overflow: 'hidden', alignItems: alignToFlex(misureStyle.align) }}>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Text style={{
              fontSize: misureStyle.fontSize,
              fontFamily: fieldFont(misureStyle),
              color: misureStyle.color,
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
              <View style={[s.priceItem, { alignItems: alignToFlex(cfs.prezzoCosto.align) }]}>
                <Text style={[s.priceLabel, { color: cfs.prezzoCosto.color }]}>Costo i.e.</Text>
                <Text style={{
                  fontSize: cfs.prezzoCosto.fontSize,
                  fontFamily: fieldFont(cfs.prezzoCosto),
                  color: cfs.prezzoCosto.color,
                }}>
                  {euro(product.costPrice)}
                </Text>
              </View>
            )}
            {f.pvp && (
              <View style={[s.priceItem, { alignItems: alignToFlex(cfs.pvp.align) }]}>
                <Text style={[s.priceLabel, { color: cfs.pvp.color }]}>PVP i.i.</Text>
                <Text style={{
                  fontSize: cfs.pvp.fontSize,
                  fontFamily: fieldFont(cfs.pvp),
                  color: cfs.pvp.color,
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

  // ITEM 4B: logo grid position
  const posX = cov.logoPosX ?? (
    cov.logoPosizione?.includes('center') ? 'center' :
    cov.logoPosizione?.includes('right') ? 'right' : 'left'
  );
  const posY = cov.logoPosY ?? 'top';
  const logoJustify: 'flex-start' | 'center' | 'flex-end' =
    posX === 'center' ? 'center' : posX === 'right' ? 'flex-end' : 'flex-start';
  const logoVertical: Record<string, number> = {
    top: 28,
    middle: pageH / 2 - logoH / 2,
    bottom: pageH - logoH - 28,
  };
  const logoTop = logoVertical[posY] ?? 28;

  const titleAlign = cov.titoloAllineamento ?? 'center';
  const subtitleAlign = cov.sottotitoloAllineamento ?? 'center';

  // ITEM 3B: image position/scale/opacity helpers
  const imgScale = cov.imgScale ?? 100;
  const imgOffsetX = cov.imgOffsetX ?? 0;
  const imgOffsetY = cov.imgOffsetY ?? 0;
  const imgOpacity = (cov.imgOpacity ?? 100) / 100;

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
    const imgW = pageW * imgScale / 100;
    const imgH = pageH * imgScale / 100;
    const imgLeft = (pageW - imgW) / 2 + (pageW * imgOffsetX / 100);
    const imgTop = (pageH - imgH) / 2 + (pageH * imgOffsetY / 100);

    return (
      <Page size={[pageW, pageH] as [number, number]} style={{ fontFamily: 'Helvetica' }}>
        {cov.immagineBase64 && (
          <Image
            src={cov.immagineBase64}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            style={{ position: 'absolute', top: imgTop, left: imgLeft, width: imgW, height: imgH, objectFit: 'cover' as any, opacity: imgOpacity }}
          />
        )}

        {/* Logo — position from grid */}
        {coverLogoBase64 && (
          <View
            style={{
              position: 'absolute',
              top: logoTop,
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
          <View style={{ width: '100%', alignItems: alignToFlex(titleAlign), marginBottom: 6 }}>
            <Text style={{ fontSize: typo.titoloFontSize, fontFamily: titleFont, color: typo.titoloColor, letterSpacing: 3 }}>
              {titoloText}
            </Text>
          </View>
          {cov.sottotitolo ? (
            <View style={{ width: '100%', alignItems: alignToFlex(subtitleAlign) }}>
              <Text style={{ fontSize: typo.sottotitoloFontSize, fontFamily: subtitleFont, color: typo.sottotitoloColor, letterSpacing: 1, opacity: 0.85 }}>
                {cov.sottotitolo}
              </Text>
            </View>
          ) : null}
        </View>
      </Page>
    );
  }

  if (cov.layout === 'half') {
    const halfH = pageH / 2;
    const imgWh = pageW * imgScale / 100;
    const imgHh = halfH * imgScale / 100;
    const imgLeftH = (pageW - imgWh) / 2 + (pageW * imgOffsetX / 100);
    const imgTopH = (halfH - imgHh) / 2 + (halfH * imgOffsetY / 100);

    return (
      <Page size={[pageW, pageH] as [number, number]} style={{ fontFamily: 'Helvetica' }}>
        {/* Top half: image */}
        {cov.immagineBase64 ? (
          <Image
            src={cov.immagineBase64}
            style={{
              position: 'absolute',
              top: imgTopH,
              left: imgLeftH,
              width: imgWh,
              height: imgHh,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              objectFit: 'cover' as any,
              opacity: imgOpacity,
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
          <View style={{ width: '100%', alignItems: alignToFlex(titleAlign), marginBottom: 8 }}>
            <Text style={{ fontSize: typo.titoloFontSize, fontFamily: titleFont, color: typo.titoloColor, letterSpacing: 3 }}>
              {titoloText}
            </Text>
          </View>
          {cov.sottotitolo ? (
            <View style={{ width: '100%', alignItems: alignToFlex(subtitleAlign) }}>
              <Text style={{ fontSize: typo.sottotitoloFontSize, fontFamily: subtitleFont, color: typo.sottotitoloColor, letterSpacing: 1 }}>
                {cov.sottotitolo}
              </Text>
            </View>
          ) : null}
        </View>
      </Page>
    );
  }

  // solo-testo (no image)
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
      <View style={{ width: '100%', alignItems: alignToFlex(titleAlign), marginBottom: 12 }}>
        <Text style={{ fontSize: typo.titoloFontSize, fontFamily: titleFont, color: typo.titoloColor, letterSpacing: 4 }}>
          {titoloText}
        </Text>
      </View>
      {cov.sottotitolo ? (
        <View style={{ width: '100%', alignItems: alignToFlex(subtitleAlign) }}>
          <Text style={{ fontSize: typo.sottotitoloFontSize, fontFamily: subtitleFont, color: typo.sottotitoloColor, letterSpacing: 1.5 }}>
            {cov.sottotitolo}
          </Text>
        </View>
      ) : null}
    </Page>
  );
}

// ── Final page ────────────────────────────────────────────────────────────────

function parseTitleInlines(titolo: string, typo: { titoloBold: boolean; titoloItalic: boolean }): HtmlInline[] {
  if (!titolo) return [];
  if (titolo.trimStart().startsWith('<')) {
    const blocks = parseHtmlToPdf(titolo);
    if (blocks.length > 0 && (blocks[0].type === 'paragraph' || blocks[0].type === 'h1' || blocks[0].type === 'h2')) {
      return blocks[0].inlines;
    }
    const plain = titolo.replace(/<[^>]+>/g, '').trim();
    return plain ? [{ text: plain, bold: false, italic: false }] : [];
  }
  return [{ text: titolo, bold: typo.titoloBold, italic: typo.titoloItalic }];
}

function renderTitleInlines(inlines: HtmlInline[], typo: { titoloFontSize: number; titoloColor: string }, titleAlign: 'left' | 'center' | 'right', mb = 18) {
  if (inlines.length === 0) return null;
  return (
    <View style={{ width: '100%', alignItems: alignToFlex(titleAlign), marginBottom: mb }}>
      <Text style={{ fontSize: typo.titoloFontSize, color: typo.titoloColor, letterSpacing: 2 }}>
        {inlines.map((seg, i) => (
          <Text key={i} style={{
            fontFamily: (seg.bold && seg.italic) ? 'Helvetica-BoldOblique' : seg.bold ? 'Helvetica-Bold' : seg.italic ? 'Helvetica-Oblique' : 'Helvetica',
          }}>{seg.text}</Text>
        ))}
      </Text>
    </View>
  );
}

function resolveFinalLogo(pf: CatalogConfig['paginaFinale'], headerLogoBase64: string | null): string | null {
  const logoTipo = pf.logoTipo ?? (pf.mostraLogo ? 'onearth' : 'none');
  if (logoTipo === 'none') return null;
  if (logoTipo === 'custom') return pf.logoCustomBase64 ?? null;
  return headerLogoBase64;
}

const FINAL_LOGO_H: Record<string, number> = { piccolo: 14, medio: 22, grande: 34 };

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

  const titleInlines = parseTitleInlines(pf.titolo, typo);
  const bodyBlocks = parseHtmlToPdf(pf.testo ?? '');

  const imgSrc = pf.immagineBase64 ?? null;

  // Resolve layout — new field takes precedence, fall back to legacy immaginePosition
  const legacyLayoutMap: Record<string, string> = {
    top: 'img-top',
    center: 'img-top',
    bottom: 'img-bottom',
    background: 'background',
  };
  const resolvedLayout: string = pf.layout ?? legacyLayoutMap[pf.immaginePosition ?? ''] ?? 'img-top';

  // Image transform parameters
  const imgScale = pf.imgScale ?? 100;
  const imgOffsetX = pf.imgOffsetX ?? 0;
  const imgOffsetY = pf.imgOffsetY ?? 0;
  const imgOpacity = (pf.imgOpacity ?? 100) / 100;

  // Logo parameters
  const finalLogoBase64 = resolveFinalLogo(pf, config.logoBase64);
  const logoDim = pf.logoDimensione ?? 'medio';
  const logoH = FINAL_LOGO_H[logoDim] ?? 22;
  const logoPosX = pf.logoPosX ?? 'center';
  const logoPosY = pf.logoPosY ?? 'bottom';
  const logoJustify: 'flex-start' | 'center' | 'flex-end' =
    logoPosX === 'center' ? 'center' : logoPosX === 'right' ? 'flex-end' : 'flex-start';
  const LOGO_MARGIN = 30;
  const logoVertical: Record<string, number> = {
    top: LOGO_MARGIN,
    middle: pageH / 2 - logoH / 2,
    bottom: pageH - logoH - LOGO_MARGIN,
  };
  const logoTop = logoVertical[logoPosY] ?? (pageH - logoH - LOGO_MARGIN);

  // Helper: render logo absolutely positioned
  const logoView = finalLogoBase64 ? (
    <View
      style={{
        position: 'absolute',
        top: logoTop,
        left: LOGO_MARGIN,
        right: LOGO_MARGIN,
        flexDirection: 'row',
        justifyContent: logoJustify,
      }}
    >
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <Image src={finalLogoBase64} style={{ height: logoH, objectFit: 'contain' as any }} />
    </View>
  ) : null;

  // Helper: compute img position/size for absolute placement (full-area img)
  function fullImgStyle(areaW: number, areaH: number) {
    const imgW = areaW * imgScale / 100;
    const imgH = areaH * imgScale / 100;
    const left = (areaW - imgW) / 2 + (areaW * imgOffsetX / 100);
    const top = (areaH - imgH) / 2 + (areaH * imgOffsetY / 100);
    return { position: 'absolute' as const, top, left, width: imgW, height: imgH, objectFit: 'cover' as any, opacity: imgOpacity }; // eslint-disable-line @typescript-eslint/no-explicit-any
  }

  const PAD_H = 60;
  const PAD_V = 48;

  // ── full-overlay ─────────────────────────────────────────────────────────────
  if (resolvedLayout === 'full-overlay') {
    return (
      <Page size={[pageW, pageH] as [number, number]} style={{ fontFamily: 'Helvetica', backgroundColor: config.colori.sfondoPagina }}>
        {imgSrc && <Image src={imgSrc} style={fullImgStyle(pageW, pageH)} />}
        {/* Gradient overlay */}
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: pageH * 0.45, backgroundColor: '#000000', opacity: 0.55 }} />
        {/* Text on top */}
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: pageH * 0.45, justifyContent: 'flex-end', paddingHorizontal: PAD_H, paddingBottom: PAD_V }}>
          {renderTitleInlines(titleInlines, typo, titleAlign, 8)}
          {bodyBlocks.length > 0 ? (
            <View style={{ width: '100%' }}>
              {renderHtmlBlocks(bodyBlocks, { fontSize: typo.testoFontSize, color: typo.testoColor, defaultAlign: textAlign })}
            </View>
          ) : null}
        </View>
        {logoView}
      </Page>
    );
  }

  // ── background ───────────────────────────────────────────────────────────────
  if (resolvedLayout === 'background') {
    return (
      <Page size={[pageW, pageH] as [number, number]} style={{ fontFamily: 'Helvetica', backgroundColor: config.colori.sfondoPagina }}>
        {imgSrc && <Image src={imgSrc} style={fullImgStyle(pageW, pageH)} />}
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', paddingHorizontal: PAD_H, paddingVertical: PAD_V }}>
          {renderTitleInlines(titleInlines, typo, titleAlign)}
          {bodyBlocks.length > 0 ? (
            <View style={{ width: '100%' }}>
              {renderHtmlBlocks(bodyBlocks, { fontSize: typo.testoFontSize, color: typo.testoColor, defaultAlign: textAlign })}
            </View>
          ) : null}
        </View>
        {logoView}
      </Page>
    );
  }

  // ── img-only ─────────────────────────────────────────────────────────────────
  if (resolvedLayout === 'img-only') {
    return (
      <Page size={[pageW, pageH] as [number, number]} style={{ fontFamily: 'Helvetica', backgroundColor: config.colori.sfondoPagina }}>
        {imgSrc && <Image src={imgSrc} style={fullImgStyle(pageW, pageH)} />}
        {logoView}
      </Page>
    );
  }

  // ── img-left ─────────────────────────────────────────────────────────────────
  if (resolvedLayout === 'img-left') {
    const imgAreaW = pageW * 0.45;
    const imgW = imgAreaW * imgScale / 100;
    const imgH = pageH * imgScale / 100;
    const imgLeft = (imgAreaW - imgW) / 2 + (imgAreaW * imgOffsetX / 100);
    const imgTop = (pageH - imgH) / 2 + (pageH * imgOffsetY / 100);
    return (
      <Page size={[pageW, pageH] as [number, number]} style={{ fontFamily: 'Helvetica', backgroundColor: config.colori.sfondoPagina, flexDirection: 'row' }}>
        {/* Left image area */}
        <View style={{ width: imgAreaW, height: pageH, overflow: 'hidden' }}>
          {imgSrc && (
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            <Image src={imgSrc} style={{ position: 'absolute', top: imgTop, left: imgLeft, width: imgW, height: imgH, objectFit: 'cover' as any, opacity: imgOpacity }} />
          )}
        </View>
        {/* Right text area */}
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 32, paddingVertical: PAD_V }}>
          {renderTitleInlines(titleInlines, typo, titleAlign)}
          {bodyBlocks.length > 0 ? (
            <View style={{ width: '100%' }}>
              {renderHtmlBlocks(bodyBlocks, { fontSize: typo.testoFontSize, color: typo.testoColor, defaultAlign: textAlign })}
            </View>
          ) : null}
        </View>
        {logoView}
      </Page>
    );
  }

  // ── img-bottom ───────────────────────────────────────────────────────────────
  if (resolvedLayout === 'img-bottom') {
    const imgAreaH = pageH * 0.4;
    const textAreaH = pageH - imgAreaH;
    const imgW = pageW * imgScale / 100;
    const imgH = imgAreaH * imgScale / 100;
    const imgLeft = (pageW - imgW) / 2 + (pageW * imgOffsetX / 100);
    const imgTop = (imgAreaH - imgH) / 2 + (imgAreaH * imgOffsetY / 100);
    return (
      <Page size={[pageW, pageH] as [number, number]} style={{ fontFamily: 'Helvetica', backgroundColor: config.colori.sfondoPagina }}>
        {/* Top text area */}
        <View style={{ height: textAreaH, justifyContent: 'center', paddingHorizontal: PAD_H, paddingVertical: PAD_V }}>
          {renderTitleInlines(titleInlines, typo, titleAlign)}
          {bodyBlocks.length > 0 ? (
            <View style={{ width: '100%' }}>
              {renderHtmlBlocks(bodyBlocks, { fontSize: typo.testoFontSize, color: typo.testoColor, defaultAlign: textAlign })}
            </View>
          ) : null}
        </View>
        {/* Bottom image area */}
        <View style={{ height: imgAreaH, overflow: 'hidden' }}>
          {imgSrc && (
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            <Image src={imgSrc} style={{ position: 'absolute', top: imgTop, left: imgLeft, width: imgW, height: imgH, objectFit: 'cover' as any, opacity: imgOpacity }} />
          )}
        </View>
        {logoView}
      </Page>
    );
  }

  // ── img-top (default) ────────────────────────────────────────────────────────
  const imgAreaH = pageH * 0.4;
  const textAreaH = pageH - imgAreaH;
  const imgW = pageW * imgScale / 100;
  const imgH = imgAreaH * imgScale / 100;
  const imgLeft = (pageW - imgW) / 2 + (pageW * imgOffsetX / 100);
  const imgTop = (imgAreaH - imgH) / 2 + (imgAreaH * imgOffsetY / 100);
  return (
    <Page size={[pageW, pageH] as [number, number]} style={{ fontFamily: 'Helvetica', backgroundColor: config.colori.sfondoPagina }}>
      {/* Top image area */}
      <View style={{ height: imgAreaH, overflow: 'hidden' }}>
        {imgSrc && (
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          <Image src={imgSrc} style={{ position: 'absolute', top: imgTop, left: imgLeft, width: imgW, height: imgH, objectFit: 'cover' as any, opacity: imgOpacity }} />
        )}
      </View>
      {/* Bottom text area */}
      <View style={{ height: textAreaH, justifyContent: 'center', paddingHorizontal: PAD_H, paddingVertical: PAD_V }}>
        {renderTitleInlines(titleInlines, typo, titleAlign)}
        {bodyBlocks.length > 0 ? (
          <View style={{ width: '100%' }}>
            {renderHtmlBlocks(bodyBlocks, { fontSize: typo.testoFontSize, color: typo.testoColor, defaultAlign: textAlign })}
          </View>
        ) : null}
      </View>
      {logoView}
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
        <View style={{ width: '100%', alignItems: alignToFlex(sep.align), marginBottom: 12 }}>
          <Text style={{ fontSize: sep.fontSize, fontFamily: sepFont, color: sep.color, letterSpacing: 3 }}>
            {displayKey}
          </Text>
        </View>
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
      <View style={{ width: '100%', alignItems: alignToFlex(sep.align) }}>
        <Text style={{ fontSize: Math.max(6, sep.fontSize * 0.6), fontFamily: sepFont, color: sep.color, letterSpacing: 1 }}>
          {displayKey}
        </Text>
      </View>
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
      <View style={{ width: '100%', alignItems: alignToFlex(sep.align) }}>
        <Text style={{ fontSize: sep.fontSize, fontFamily: sepFont, color: sep.color, letterSpacing: 1.5 }}>
          {displayKey}
        </Text>
      </View>
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
