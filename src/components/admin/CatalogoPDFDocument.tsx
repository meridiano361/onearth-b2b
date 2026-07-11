import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image, Link, Font } from '@react-pdf/renderer';

// Register custom fonts (fetched from CDN at PDF generation time)
Font.register({ family: 'Inter',           src: 'https://cdn.jsdelivr.net/npm/@fontsource/inter/files/inter-latin-400-normal.woff2' });
Font.register({ family: 'Inter-Bold',      src: 'https://cdn.jsdelivr.net/npm/@fontsource/inter/files/inter-latin-700-normal.woff2' });
Font.register({ family: 'Lato',            src: 'https://cdn.jsdelivr.net/npm/@fontsource/lato/files/lato-latin-400-normal.woff2' });
Font.register({ family: 'Lato-Bold',       src: 'https://cdn.jsdelivr.net/npm/@fontsource/lato/files/lato-latin-700-normal.woff2' });
Font.register({ family: 'Montserrat',      src: 'https://cdn.jsdelivr.net/npm/@fontsource/montserrat/files/montserrat-latin-400-normal.woff2' });
Font.register({ family: 'Montserrat-Bold', src: 'https://cdn.jsdelivr.net/npm/@fontsource/montserrat/files/montserrat-latin-700-normal.woff2' });
Font.register({ family: 'Playfair',        src: 'https://cdn.jsdelivr.net/npm/@fontsource/playfair-display/files/playfair-display-latin-400-normal.woff2' });
Font.register({ family: 'Playfair-Bold',   src: 'https://cdn.jsdelivr.net/npm/@fontsource/playfair-display/files/playfair-display-latin-700-normal.woff2' });
Font.register({ family: 'Nova',            src: 'https://cdn.jsdelivr.net/npm/@fontsource/nova-flat/files/nova-flat-latin-400-normal.woff2' });
Font.register({ family: 'Nova-Bold',       src: 'https://cdn.jsdelivr.net/npm/@fontsource/nova-flat/files/nova-flat-latin-400-normal.woff2' });

const APP_BASE_URL = 'https://app.b2b.on-earth.it';
import { parse as parseHtmlNode } from 'node-html-parser';

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
  campoNome?: 'descrizione' | 'nome';
};

// ── New typography types ──────────────────────────────────────────────────────

export type FieldStyle = {
  fontSize: number;
  bold: boolean;
  italic: boolean;
  color: string;
  align: 'left' | 'center' | 'right';
  uppercase: boolean;
  marginBottom?: number;
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
  // Extended fields
  titoloFontFamily?: string;
  sottotitoloFontFamily?: string;
  sottotitolo2FontSize?: number;
  sottotitolo2Bold?: boolean;
  sottotitolo2Italic?: boolean;
  sottotitolo2Color?: string;
  sottotitolo2FontFamily?: string;
  spacingTitoloSottotitolo?: number;
  spacingSottotitoloSottotitolo2?: number;
  titoloLetterSpacing?: number;
  sottotitoloLetterSpacing?: number;
};

export type FinalPageTypography = {
  titoloFontSize: number;
  titoloBold: boolean;
  titoloItalic: boolean;
  titoloColor: string;
  titoloFontFamily?: string;
  titoloUppercase?: boolean;
  titoloUnderline?: boolean;
  titoloHighlight?: string;
  testoFontSize: number;
  testoColor: string;
  testoFontFamily?: string;
  testoBold?: boolean;
  testoItalic?: boolean;
  testoUnderline?: boolean;
  testoUppercase?: boolean;
  testoHighlight?: string;
  // Spaziatura
  titoloMarginBottom?: number;
  sezione1MarginBottom?: number;
  sezione2MarginBottom?: number;
  marginTop?: number;
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
  fontFamiglia?: string;
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
    sottotitolo2?: string;
    sottotitolo2Allineamento?: 'left' | 'center' | 'right';
    layout: 'full-overlay' | 'half' | 'solo-testo';
    logoTipo: 'onearth' | 'custom' | 'none';
    logoCustomBase64: string | null;
    logoCustomH?: number;
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
    // Second logo
    logo2Tipo?: 'custom' | 'none';
    logo2CustomBase64?: string | null;
    logo2PosX?: 'left' | 'center' | 'right';
    logo2PosY?: 'top' | 'middle' | 'bottom';
    logo2Dimensione?: 'piccolo' | 'medio' | 'grande';
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
    sezioneFinale3Attiva?: boolean;
    sezioneFinale3Html?: string;
    sezioneFinale3FontSize?: number;
    sezioneFinale3Colore?: string;
    sezioneFinale3Align?: 'left' | 'center' | 'right';
    testoSfondoColore?: string;
    // Second logo
    logo2Tipo?: 'custom' | 'none';
    logo2CustomBase64?: string | null;
    logo2PosX?: 'left' | 'center' | 'right';
    logo2Posizione?: 'above-title' | 'between' | 'below-text';
    logo2Dimensione?: 'piccolo' | 'medio' | 'grande';
  };
  paginaPenultima?: {
    attiva: boolean;
    titolo: string;
    testo: string;
    mostraLogo: boolean;
    titoloAllineamento: 'left' | 'center' | 'right';
    testoAllineamento: 'left' | 'center' | 'right';
    immagineUrl?: string | null;
    immagineBase64?: string | null;
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
    sezioneFinale3Attiva?: boolean;
    sezioneFinale3Html?: string;
    sezioneFinale3FontSize?: number;
    sezioneFinale3Colore?: string;
    sezioneFinale3Align?: 'left' | 'center' | 'right';
    testoSfondoColore?: string;
    // Second logo
    logo2Tipo?: 'custom' | 'none';
    logo2CustomBase64?: string | null;
    logo2PosX?: 'left' | 'center' | 'right';
    logo2Posizione?: 'above-title' | 'between' | 'below-text';
    logo2Dimensione?: 'piccolo' | 'medio' | 'grande';
  };
  // Typography customization
  cardFieldStyles: CardFieldStyles;
  separatoreStyle: SeparatorStyle;
  headerStyle: PageHeaderStyle;
  footerStyle: PageFooterStyle;
  cardBoxStyle: CardBoxStyle;
  copertinaTypo: CoverTypography;
  paginaFinaleTypo: FinalPageTypography;
  paginaPenultimaTypo?: FinalPageTypography;
  nuovoBadge?: {
    attivo: boolean;
    testo: string;
    bgColor: string;
    textColor: string;
    posizione: 'image-top-right' | 'next-to-code';
  };
  fotoConfig?: {
    numero: 'solo-principale' | 'tutte' | 'scegli';
    quantita: number;
    layout: 'grande-thumbnail' | 'griglia-2x2' | 'prima-disponibile';
  };
  suddividiPerTranche?: boolean;
  trancheGroups?: TrancheGroup[];
  separatoreTrancheAttivo?: boolean;
  stileSeparatoreTranche?: TrancheSeparatoreStyle;
  includeTrancheSenzaNome?: boolean;
  ordineTranche?: 'az' | 'za' | 'custom';
  trancheOrder?: string[];
  fieldOrder?: string[];
};

export type TrancheSeparatoreStyle = {
  bgColor: string;
  color: string;
  fontSize: number;
  bold: boolean;
  uppercase: boolean;
  mostraNProdotti: boolean;
};

export type ProductForPDF = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  costPrice: number;
  retailPrice: number;
  costoIeConReso?: number | null;
  costoIeSenzaReso?: number | null;
  lotSize: number;
  misura: string | null;
  produttore: string | null;
  paese: string | null;
  nomLinea: string | null;
  collezione: string | null;
  iva: number;
  imageDataUri: string | null;
  imageDataUri2?: string | null;
  imageDataUri3?: string | null;
  imageDataUri4?: string | null;
  classe: string | null;
  sottoclasse: string | null;
  famiglia: string | null;
  gruppoOmogeneo: string | null;
  tranche?: string | null;
};

export type GroupForPDF = {
  key: string;
  products: ProductForPDF[];
};

export type TrancheGroup = {
  tranche: string;
  productCount: number;
  groups: GroupForPDF[];
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

// Bakes alpha into hex color as rgba() — avoids react-pdf transparency group bug (opacity prop creates PDF Form XObjects that hide sibling Text elements)
function hexToRgba(hex: string, alpha: number): string {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) return hex;
  return `rgba(${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)},${alpha})`;
}

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

function resolveFamily(fontFamiglia?: string): string {
  switch (fontFamiglia) {
    case 'inter':      return 'Inter';
    case 'lato':       return 'Lato';
    case 'montserrat': return 'Montserrat';
    case 'playfair':   return 'Playfair';
    case 'nova':       return 'Nova';
    default:           return 'Helvetica';
  }
}

function fieldFont(fs: FieldStyle, fontFamiglia?: string): string {
  const base = resolveFamily(fontFamiglia);
  if (base === 'Helvetica') {
    if (fs.bold && fs.italic) return 'Helvetica-BoldOblique';
    if (fs.bold) return 'Helvetica-Bold';
    if (fs.italic) return 'Helvetica-Oblique';
    return 'Helvetica';
  }
  return fs.bold ? `${base}-Bold` : base;
}

type Segment = { text: string; bold: boolean; italic: boolean };

// ── HTML → react-pdf parser ────────────────────────────────────────────────────

type HtmlInline = { text: string; bold: boolean; italic: boolean; underline?: boolean; strike?: boolean };
type HtmlBlock =
  | { type: 'paragraph' | 'h1' | 'h2'; align: 'left' | 'center' | 'right'; hasExplicitAlign: boolean; inlines: HtmlInline[] }
  | { type: 'bullet' | 'ordered'; items: HtmlInline[][] };

function decodeHtmlEntities(s: string): string {
  return s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

type InlineCtx = { bold: boolean; italic: boolean; underline: boolean; strike: boolean };
const BASE_CTX: InlineCtx = { bold: false, italic: false, underline: false, strike: false };

function collectInlines(node: any, ctx: InlineCtx = BASE_CTX): HtmlInline[] {
  if (node.nodeType === 3) {
    const text = decodeHtmlEntities(node.rawText ?? '');
    if (!text) return [];
    return [{ text, ...ctx }];
  }
  const tag = ((node.tagName as string) ?? '').toLowerCase();
  if (tag === 'br') return [{ text: '\n', ...ctx }];
  const next: InlineCtx = {
    bold: ctx.bold || tag === 'strong' || tag === 'b',
    italic: ctx.italic || tag === 'em' || tag === 'i',
    underline: ctx.underline || tag === 'u',
    strike: ctx.strike || tag === 's',
  };
  return (node.childNodes ?? []).flatMap((child: any) => collectInlines(child, next));
}

function parseHtmlToPdf(html: string): HtmlBlock[] {
  if (!html?.trim() || html.trim() === '<p></p>') return [];
  const root = parseHtmlNode(html);
  const blocks: HtmlBlock[] = [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const node of root.childNodes as any[]) {
    const tag = ((node.tagName as string) ?? '').toLowerCase();
    if (tag === 'p' || tag === 'h1' || tag === 'h2') {
      const styleAttr: string = node.getAttribute?.('style') ?? '';
      const classAttr: string = node.getAttribute?.('class') ?? '';
      const dataAlign: string = node.getAttribute?.('data-text-align') ?? '';
      let align: 'left' | 'center' | 'right' = 'left';
      let hasExplicitAlign = false;
      const styleMatch = styleAttr.match(/text-align\s*:\s*(left|center|right)/);
      if (styleMatch) {
        align = styleMatch[1] as 'left' | 'center' | 'right';
        hasExplicitAlign = true;
      } else if (classAttr.includes('text-right') || dataAlign === 'right') {
        align = 'right';
        hasExplicitAlign = true;
      } else if (classAttr.includes('text-center') || dataAlign === 'center') {
        align = 'center';
        hasExplicitAlign = true;
      }
      const inlines = collectInlines(node);
      blocks.push({
        type: tag === 'h1' ? 'h1' : tag === 'h2' ? 'h2' : 'paragraph',
        align,
        hasExplicitAlign,
        inlines: inlines.length > 0 ? inlines : [{ text: ' ', bold: false, italic: false }],
      });
    } else if (tag === 'ul' || tag === 'ol') {
      const items: HtmlInline[][] = [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const child of (node.childNodes ?? []) as any[]) {
        if (((child.tagName as string) ?? '').toLowerCase() !== 'li') continue;
        const inlines = collectInlines(child);
        if (inlines.length > 0) items.push(inlines);
      }
      if (items.length > 0) blocks.push({ type: tag === 'ul' ? 'bullet' : 'ordered', items });
    }
  }

  if (blocks.length === 0) {
    const plain = html.replace(/<[^>]+>/g, '').trim();
    if (plain) blocks.push({ type: 'paragraph', align: 'left', hasExplicitAlign: false, inlines: [{ text: plain, bold: false, italic: false }] });
  }
  return blocks;
}

function getBlockAlign(block: HtmlBlock, defaultAlign: 'left' | 'center' | 'right'): 'left' | 'center' | 'right' {
  if (block.type === 'paragraph' || block.type === 'h1' || block.type === 'h2') {
    // hasExplicitAlign: text-align set in HTML → honour it even if it's 'left'
    // no explicit align: use the page-level default
    return block.hasExplicitAlign ? block.align : defaultAlign;
  }
  return defaultAlign;
}

function renderHtmlBlocks(
  blocks: HtmlBlock[],
  opts: { fontSize: number; color: string; defaultAlign: 'left' | 'center' | 'right'; bold?: boolean; italic?: boolean; underline?: boolean; uppercase?: boolean; fontFamily?: string },
): React.ReactNode[] {
  const { fontSize, color, defaultAlign } = opts;
  const globalBold = opts.bold ?? false;
  const globalItalic = opts.italic ?? false;
  const globalUnderline = opts.underline ?? false;
  const globalUppercase = opts.uppercase ?? false;
  const baseFam = resolveFamily(opts.fontFamily ?? 'helvetica');
  return blocks.map((block, i) => {
    const blockAlign = getBlockAlign(block, defaultAlign);

    const inlineText = (inlines: HtmlInline[], c: string) =>
      inlines.map((seg, j) => {
        const bold = globalBold || seg.bold;
        const italic = globalItalic || seg.italic;
        const underline = globalUnderline || seg.underline;
        const decoration = underline ? 'underline' : seg.strike ? 'line-through' : undefined;
        const fam = baseFam === 'Helvetica'
          ? ((bold && italic) ? 'Helvetica-BoldOblique' : bold ? 'Helvetica-Bold' : italic ? 'Helvetica-Oblique' : 'Helvetica')
          : (bold ? `${baseFam}-Bold` : baseFam);
        const text = globalUppercase ? seg.text.toUpperCase() : seg.text;
        return (
          <Text key={j} style={{
            fontFamily: fam,
            color: c,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ...(decoration ? { textDecoration: decoration as any } : {}),
          }}>{text}</Text>
        );
      });

    if (block.type === 'paragraph') {
      return (
        <View key={i} style={{ width: '100%', alignItems: alignToFlex(blockAlign), marginBottom: 3 }}>
          <Text style={{ fontSize, color, lineHeight: 1.6 }}>{inlineText(block.inlines, color)}</Text>
        </View>
      );
    }
    if (block.type === 'h1') {
      return (
        <View key={i} style={{ width: '100%', alignItems: alignToFlex(blockAlign), marginBottom: 6 }}>
          <Text style={{ fontSize: fontSize * 1.6, fontFamily: 'Helvetica-Bold', color, lineHeight: 1.4 }}>{inlineText(block.inlines, color)}</Text>
        </View>
      );
    }
    if (block.type === 'h2') {
      return (
        <View key={i} style={{ width: '100%', alignItems: alignToFlex(blockAlign), marginBottom: 4 }}>
          <Text style={{ fontSize: fontSize * 1.3, fontFamily: 'Helvetica-Bold', color, lineHeight: 1.4 }}>{inlineText(block.inlines, color)}</Text>
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
                <Text style={{ fontSize, color, lineHeight: 1.6 }}>{inlineText(item, color)}</Text>
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
  ROW_GAP: number;
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

  // Flags needed before computing IMG_H
  const anyDetail = f.misure || f.linea || f.collezione || f.confezione || f.iva;
  const anyPrice  = f.prezzoCosto || f.pvp || f.produttore || f.paese;

  const TEXT_PAD = config.cardBoxStyle?.padding ?? 4;
  const CODE_H = 10;
  const ROW_GAP = 2;

  // DETAIL_H: dynamic so the misure line always fits (was hardcoded 10 — too tight)
  const misureFs = config.cardFieldStyles?.misure?.fontSize ?? 6.5;
  const DETAIL_H = Math.ceil(misureFs * 1.5) + 2;

  // ── PRICES_H ─────────────────────────────────────────────────────────────────
  // Each price field (prezzoCosto / pvp) renders as TWO lines:
  //   line 1 — label at fixed 5 pt  (always fits in column width)
  //   line 2 — value at configured fontSize  (just "€XX,XX", always fits)
  // This prevents the label+value combined text from wrapping unpredictably.
  const PRICE_LABEL_FS = 5;
  const PRICE_LABEL_LINE_H = Math.ceil(PRICE_LABEL_FS * 1.4); // ~7 pt

  const priceValueFs = Math.max(
    f.prezzoCosto ? (config.cardFieldStyles?.prezzoCosto?.fontSize ?? 8) : 0,
    f.pvp         ? (config.cardFieldStyles?.pvp?.fontSize ?? 8)         : 0,
  );
  const priceValueLineH = priceValueFs > 0 ? Math.ceil(priceValueFs * 1.4) : 0;
  const priceFieldCount = (f.prezzoCosto ? 1 : 0) + (f.pvp ? 1 : 0);
  // +1 pt gap between label and value per field
  const priceColH = priceFieldCount > 0
    ? priceFieldCount * (PRICE_LABEL_LINE_H + priceValueLineH + 1)
    : 0;

  const supplierFs = Math.max(
    f.produttore ? (config.cardFieldStyles?.produttore?.fontSize ?? 6.5) : 0,
    f.paese      ? (config.cardFieldStyles?.paese?.fontSize ?? 6.5)      : 0,
  );
  const supplierColLines = (f.produttore ? 1 : 0) + (f.paese ? 1 : 0);
  const supplierColH = supplierColLines > 0
    ? supplierColLines * Math.ceil(supplierFs * 1.4)
    : 0;

  const PRICES_H = anyPrice ? Math.max(priceColH, supplierColH, 14) : 0;

  // ── DESC_H: always 2 lines ────────────────────────────────────────────────────
  // IMG_H is capped below to guarantee this space is always available.
  const descFontSize = config.cardFieldStyles?.descrizione?.fontSize ?? 8;
  const desc2LineH = Math.ceil(descFontSize * 1.5 * 2) + 4;
  const DESC_H = f.descrizione ? desc2LineH : 0;

  // ── IMG_H: 56% of card, but capped so text always fits ───────────────────────
  const bottomPad = anyPrice ? PRICES_H + TEXT_PAD : TEXT_PAD;
  const minTextH = TEXT_PAD + bottomPad
    + (f.codice      ? CODE_H   + ROW_GAP : 0)
    + (f.descrizione ? DESC_H   + ROW_GAP : 0)
    + (anyDetail     ? DETAIL_H + ROW_GAP : 0);

  const IMG_H = f.foto
    ? Math.max(20, Math.min(Math.round(CARD_H * 0.56), CARD_H - minTextH))
    : 0;

  const TEXT_AREA_H = CARD_H - IMG_H - (config.cardBoxStyle?.borderWidth ?? 0) * 2;

  let usedTextH = TEXT_PAD + bottomPad;
  if (f.codice)      usedTextH += CODE_H   + ROW_GAP;
  if (f.descrizione) usedTextH += DESC_H   + ROW_GAP;
  if (anyDetail)     usedTextH += DETAIL_H + ROW_GAP;

  const SPACER_H = Math.max(0, TEXT_AREA_H - usedTextH);

  return {
    pageW, pageH, M, COLS, ROWS,
    CARD_W, CARD_H, IMG_H, TEXT_AREA_H,
    TEXT_PAD, CODE_H, DESC_H, DETAIL_H, PRICES_H, ROW_GAP, SPACER_H,
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
  return '€ ' + n.toFixed(2).replace('.', ',');
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

  const anyDetail = f.misure || f.linea || f.collezione || f.confezione || f.iva;
  const anyPriceRow = f.prezzoCosto || f.pvp || f.produttore || f.paese;

  const details: string[] = [];
  if (f.misure && product.misura) details.push(product.misura);
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
      {f.foto && (() => {
        const fc = config.fotoConfig;
        const cardW = layout.CARD_W - box.borderWidth * 2;
        // Collect all available images
        const allUris = [product.imageDataUri, product.imageDataUri2, product.imageDataUri3, product.imageDataUri4].filter(Boolean) as string[];
        // Determine how many photos to show
        let maxPhotos = 1;
        if (fc) {
          if (fc.numero === 'tutte') maxPhotos = 4;
          else if (fc.numero === 'scegli') maxPhotos = fc.quantita;
        }
        const photosToShow = allUris.slice(0, maxPhotos);
        const mainUri = photosToShow[0] ?? null;
        const extraUris = photosToShow.slice(1);
        const showMultiple = photosToShow.length > 1;
        const layout2 = fc?.layout ?? 'grande-thumbnail';

        // Placeholder when no photo
        const placeholder = config.logoBase64 ? (
          <Image style={{ width: 55, height: 12 }} src={config.logoBase64} />
        ) : null;

        // NUOVO badge
        const nuovoBadge = config.nuovoBadge?.attivo && config.nuovoBadge.posizione === 'image-top-right' ? (
          <View style={{ position: 'absolute', top: 4, right: 4, backgroundColor: config.nuovoBadge.bgColor, paddingHorizontal: 4, paddingVertical: 2, borderRadius: 3 }}>
            <Text style={{ fontSize: 5, color: config.nuovoBadge.textColor, fontFamily: 'Helvetica-Bold' }}>
              {config.nuovoBadge.testo}
            </Text>
          </View>
        ) : null;

        if (!showMultiple || layout2 === 'prima-disponibile') {
          // Single photo (original behavior)
          return (
            <View style={{ width: cardW, height: layout.IMG_H, backgroundColor: colori.sfondoFoto, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              {mainUri ? (
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                <Link src={`${APP_BASE_URL}/catalog/${product.id}`} style={{ width: cardW, height: layout.IMG_H } as any}>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  <Image style={{ width: cardW, height: layout.IMG_H, objectFit: 'contain' as any }} src={mainUri} />
                </Link>
              ) : placeholder}
              {nuovoBadge}
            </View>
          );
        }

        if (layout2 === 'griglia-2x2') {
          // 2×2 grid — 4 equal cells
          const half = layout.IMG_H / 2;
          const halfW = cardW / 2;
          const cells = [photosToShow[0], photosToShow[1], photosToShow[2], photosToShow[3]];
          return (
            <View style={{ width: cardW, height: layout.IMG_H, flexDirection: 'row', flexWrap: 'wrap', overflow: 'hidden' }}>
              {cells.map((uri, idx) => (
                <View key={idx} style={{ width: halfW, height: half, backgroundColor: colori.sfondoFoto, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {uri
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    ? <Image style={{ width: halfW, height: half, objectFit: 'contain' as any }} src={uri} />
                    : placeholder}
                </View>
              ))}
              {nuovoBadge}
            </View>
          );
        }

        // Default: grande-thumbnail (main 70% + strip 30%)
        const mainH = Math.round(layout.IMG_H * 0.7);
        const thumbH = layout.IMG_H - mainH;
        const thumbW = extraUris.length > 0 ? cardW / extraUris.length : cardW;
        return (
          <View style={{ width: cardW, height: layout.IMG_H, overflow: 'hidden' }}>
            {/* Main photo */}
            <View style={{ width: cardW, height: mainH, backgroundColor: colori.sfondoFoto, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              {mainUri
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ? <Image style={{ width: cardW, height: mainH, objectFit: 'contain' as any }} src={mainUri} />
                : placeholder}
            </View>
            {/* Thumbnail strip */}
            {extraUris.length > 0 && (
              <View style={{ flexDirection: 'row', width: cardW, height: thumbH }}>
                {extraUris.map((uri, idx) => (
                  <View key={idx} style={{ width: thumbW, height: thumbH, backgroundColor: colori.sfondoFoto, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {uri
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      ? <Image style={{ width: thumbW, height: thumbH, objectFit: 'contain' as any }} src={uri} />
                      : null}
                  </View>
                ))}
              </View>
            )}
            {nuovoBadge}
          </View>
        );
      })()}

      {/* Text area — prices pinned to absolute bottom so description can use 2 lines freely */}
      <View style={{ height: layout.TEXT_AREA_H, overflow: 'hidden' }}>
        {/* Top content: flows from top, paddingBottom reserves room for the pinned prices */}
        <View style={{
          padding: box.padding,
          paddingBottom: anyPriceRow ? layout.PRICES_H + box.padding : box.padding,
        }}>
          {/* Codice */}
          {f.codice && (
            <View style={{ minHeight: layout.CODE_H, marginBottom: cfs.codice.marginBottom ?? layout.ROW_GAP, flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <Link src={`${APP_BASE_URL}/catalog/${product.id}`}>
                <Text style={{ fontSize: cfs.codice.fontSize, fontFamily: fieldFont(cfs.codice, config.fontFamiglia), color: cfs.codice.color, letterSpacing: 0.3 }}>
                  {cfs.codice.uppercase ? product.code.toUpperCase() : product.code}
                </Text>
              </Link>
              {config.nuovoBadge?.attivo && config.nuovoBadge.posizione === 'next-to-code' && (
                <View style={{ backgroundColor: config.nuovoBadge.bgColor, paddingHorizontal: 3, paddingVertical: 1, borderRadius: 2 }}>
                  <Text style={{ fontSize: 4.5, color: config.nuovoBadge.textColor, fontFamily: 'Helvetica-Bold' }}>{config.nuovoBadge.testo}</Text>
                </View>
              )}
            </View>
          )}
          {((() => { const fo = config.fieldOrder ?? ['codice', 'descrizione', 'misure']; return fo.includes('misure') ? fo : [...fo, 'misure']; })()).filter((k) => k !== 'codice').map((fieldKey) => {
            if (fieldKey === 'descrizione' && f.descrizione) return (
              // Fixed height = 2 lines; alignItems omitted so Text stretches to full width and wraps
              <View key="descrizione" style={{ height: layout.DESC_H, marginBottom: cfs.descrizione.marginBottom ?? layout.ROW_GAP, overflow: 'hidden' }}>
                <Text style={{ fontSize: cfs.descrizione.fontSize, fontFamily: fieldFont(cfs.descrizione, config.fontFamiglia), color: cfs.descrizione.color, lineHeight: 1.5, textAlign: cfs.descrizione.align }}>
                  {(() => { const raw = f.campoNome === 'nome' ? product.name : (product.description || product.name); return cfs.descrizione.uppercase ? raw.toUpperCase() : raw; })()}
                </Text>
              </View>
            );
            if (fieldKey === 'misure' && anyDetail) return (
              <View key="misure" style={{ height: layout.DETAIL_H, marginBottom: misureStyle.marginBottom ?? layout.ROW_GAP, overflow: 'hidden' }}>
                <Text style={{ fontSize: misureStyle.fontSize, fontFamily: fieldFont(misureStyle, config.fontFamiglia), color: misureStyle.color, lineHeight: 1.3, textAlign: misureStyle.align }}>
                  {detailText}
                </Text>
              </View>
            );
            return null;
          })}
        </View>

        {/* Prices: absolutely pinned to the bottom of the text area — always visible */}
        {anyPriceRow && (
          <View style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: layout.PRICES_H + box.padding,
            paddingHorizontal: box.padding,
            paddingBottom: box.padding,
          }}>
            <View style={s.priceRow}>
              {/* Left column: produttore + paese */}
              {(f.produttore || f.paese) && (
                <View style={[s.priceItem, { justifyContent: 'center' }]}>
                  {f.produttore && product.produttore ? (
                    <Text style={{ fontSize: cfs.produttore.fontSize, fontFamily: fieldFont(cfs.produttore, config.fontFamiglia), color: cfs.produttore.color, lineHeight: 1.3, marginBottom: 1.5, textAlign: cfs.produttore.align }}>
                      {cfs.produttore.uppercase ? product.produttore.toUpperCase() : product.produttore}
                    </Text>
                  ) : null}
                  {f.paese && product.paese ? (
                    <Text style={{ fontSize: cfs.paese.fontSize, fontFamily: fieldFont(cfs.paese, config.fontFamiglia), color: cfs.paese.color, lineHeight: 1.3, textAlign: cfs.paese.align }}>
                      {cfs.paese.uppercase ? product.paese.toUpperCase() : product.paese}
                    </Text>
                  ) : null}
                </View>
              )}
              {/* Right column: prezzoCosto + pvp — label on own line (5pt), value on own line (configured size) */}
              {(f.prezzoCosto || f.pvp) && (
                <View style={[s.priceItem, { justifyContent: 'center' }]}>
                  {f.prezzoCosto && (() => {
                    const conReso   = Number(product.costoIeConReso);
                    const senzaReso = Number(product.costoIeSenzaReso);
                    const hasConReso   = conReso   > 0;
                    const hasSenzaReso = senzaReso > 0;
                    const ta  = cfs.prezzoCosto.align;
                    const lbl = { fontSize: 5, color: cfs.prezzoCosto.color, textTransform: 'uppercase' as const, letterSpacing: 0.3, textAlign: ta };
                    const val = { fontSize: cfs.prezzoCosto.fontSize, fontFamily: fieldFont(cfs.prezzoCosto, config.fontFamiglia), color: cfs.prezzoCosto.color, textAlign: ta };
                    if (hasConReso) return (
                      <>
                        <Text style={lbl}>COSTO I.E. CON RESO</Text>
                        <Text style={[val, { marginBottom: 1.5 }]}>{euro(conReso)}</Text>
                        {hasSenzaReso && (
                          <>
                            <Text style={lbl}>SENZA RESO</Text>
                            <Text style={val}>{euro(senzaReso)}</Text>
                          </>
                        )}
                      </>
                    );
                    if (hasSenzaReso) return (
                      <>
                        <Text style={lbl}>COSTO I.E.</Text>
                        <Text style={val}>{euro(senzaReso)}</Text>
                      </>
                    );
                    return (
                      <>
                        <Text style={lbl}>COSTO I.E.</Text>
                        <Text style={[val, { marginBottom: f.pvp ? 1.5 : 0 }]}>{euro(product.costPrice)}</Text>
                      </>
                    );
                  })()}
                  {f.pvp && (() => {
                    const ta  = cfs.pvp.align;
                    const lbl = { fontSize: 5, color: cfs.pvp.color, textTransform: 'uppercase' as const, letterSpacing: 0.3, textAlign: ta };
                    const val = { fontSize: cfs.pvp.fontSize, fontFamily: fieldFont(cfs.pvp, config.fontFamiglia), color: cfs.pvp.color, textAlign: ta };
                    return (
                      <>
                        <Text style={lbl}>PVP I.I.</Text>
                        <Text style={val}>{euro(product.retailPrice)}</Text>
                      </>
                    );
                  })()}
                </View>
              )}
            </View>
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

// ── Multiline text helper ─────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderCoverLines(text: string, style: Record<string, any>): React.ReactNode[] {
  const lines = text.split('\n');
  return lines.map((line, i) => (
    <Text key={i} style={style}>{line || ' '}</Text>
  ));
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
  const logoH = (cov.logoTipo === 'custom' && cov.logoCustomH) ? cov.logoCustomH : (COVER_LOGO_H[cov.logoDimensione] ?? 28);

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

  function coverFont(family: string | undefined, bold: boolean, italic: boolean) {
    const f = (family ?? 'helvetica').toLowerCase();
    if (f === 'times-roman' || f === 'times') {
      if (bold && italic) return 'Times-BoldItalic';
      if (bold) return 'Times-Bold';
      if (italic) return 'Times-Italic';
      return 'Times-Roman';
    }
    if (f === 'courier') {
      if (bold && italic) return 'Courier-BoldOblique';
      if (bold) return 'Courier-Bold';
      if (italic) return 'Courier-Oblique';
      return 'Courier';
    }
    const base = resolveFamily(f); // nova→Nova, inter→Inter, etc., default→Helvetica
    if (base === 'Helvetica') {
      if (bold && italic) return 'Helvetica-BoldOblique';
      if (bold) return 'Helvetica-Bold';
      if (italic) return 'Helvetica-Oblique';
      return 'Helvetica';
    }
    return bold ? `${base}-Bold` : base;
  }

  const titleFont = coverFont(typo.titoloFontFamily, typo.titoloBold, typo.titoloItalic);
  const subtitleFont = coverFont(typo.sottotitoloFontFamily, typo.sottotitoloBold, typo.sottotitoloItalic);
  const subtitle2Font = coverFont(typo.sottotitolo2FontFamily, typo.sottotitolo2Bold ?? false, typo.sottotitolo2Italic ?? false);

  const titoloText = typo.titoloUppercase ? cov.titolo.toUpperCase() : cov.titolo;
  const subtitle2 = cov.sottotitolo2 ?? '';
  const subtitle2Align = cov.sottotitolo2Allineamento ?? 'center';
  const spacingTS = typo.spacingTitoloSottotitolo ?? 6;
  const spacingS2 = typo.spacingSottotitoloSottotitolo2 ?? 4;
  const titoloLS = typo.titoloLetterSpacing ?? 3;
  const sottotitoloLS = typo.sottotitoloLetterSpacing ?? 1;

  if (cov.layout === 'full-overlay') {
    const imgW = pageW * imgScale / 100;
    const imgH = pageH * imgScale / 100;
    const imgLeft = (pageW - imgW) / 2 + (pageW * imgOffsetX / 100);
    const imgTop = (pageH - imgH) / 2 + (pageH * imgOffsetY / 100);

    // When logo2 is at the bottom, push the text block up to avoid overlap.
    // logo2 top = pageH - logo2H - LOGO2_MARGIN (see renderCoverLogo2).
    const LOGO2_MARGIN = 30;
    const logo2Active = cov.logo2Tipo === 'custom' && !!cov.logo2CustomBase64;
    const logo2AtBottom = logo2Active && (cov.logo2PosY ?? 'bottom') === 'bottom';
    const logo2H = FINAL_LOGO_H[cov.logo2Dimensione ?? 'medio'] ?? 22;
    const textPaddingBottom = logo2AtBottom ? logo2H + LOGO2_MARGIN + 8 : 44;

    return (
      <Page size={[pageW, pageH] as [number, number]} style={{ fontFamily: resolveFamily(config.fontFamiglia) }}>
        {/* Background image — overflow:hidden isolates the objectFit clipping context */}
        {cov.immagineBase64 && (
          <View style={{ position: 'absolute', top: imgTop, left: imgLeft, width: imgW, height: imgH, overflow: 'hidden' }}>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Image src={cov.immagineBase64} style={{ width: imgW, height: imgH, objectFit: 'cover' as any }} />
          </View>
        )}

        {/* Logo — objectFit removed (height-only Image auto-maintains aspect ratio in react-pdf; no Form XObject created) */}
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
            <Image src={coverLogoBase64} style={{ height: logoH }} />
          </View>
        )}

        {/* Dark gradient overlay — rgba avoids PDF transparency-group issues */}
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 160,
            backgroundColor: 'rgba(0,0,0,0.55)',
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
            paddingBottom: textPaddingBottom,
          }}
        >
          <View style={{ width: '100%', alignItems: alignToFlex(titleAlign), marginBottom: spacingTS }}>
            {renderCoverLines(titoloText, { fontSize: typo.titoloFontSize, fontFamily: titleFont, color: typo.titoloColor, letterSpacing: titoloLS })}
          </View>
          {cov.sottotitolo ? (
            <View style={{ width: '100%', alignItems: alignToFlex(subtitleAlign), marginBottom: subtitle2 ? spacingS2 : 0 }}>
              {renderCoverLines(cov.sottotitolo, { fontSize: typo.sottotitoloFontSize, fontFamily: subtitleFont, color: hexToRgba(typo.sottotitoloColor, 0.85), letterSpacing: sottotitoloLS })}
            </View>
          ) : null}
          {subtitle2 ? (
            <View style={{ width: '100%', alignItems: alignToFlex(subtitle2Align) }}>
              {renderCoverLines(subtitle2, { fontSize: typo.sottotitolo2FontSize ?? 11, fontFamily: subtitle2Font, color: hexToRgba(typo.sottotitolo2Color ?? typo.sottotitoloColor, 0.75), letterSpacing: sottotitoloLS })}
            </View>
          ) : null}
        </View>
        {renderCoverLogo2(cov, pageW, pageH)}
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
      <Page size={[pageW, pageH] as [number, number]} style={{ fontFamily: resolveFamily(config.fontFamiglia) }}>
        {/* Top half: image clipped to half height */}
        <View style={{ position: 'absolute', top: 0, left: 0, width: pageW, height: halfH, overflow: 'hidden', backgroundColor: config.colori.sfondoPagina }}>
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
              }}
            />
          ) : null}
        </View>
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
              <Image src={coverLogoBase64} style={{ height: logoH }} />
            </View>
          )}
          <View style={{ width: '100%', alignItems: alignToFlex(titleAlign), marginBottom: spacingTS }}>
            {renderCoverLines(titoloText, { fontSize: typo.titoloFontSize, fontFamily: titleFont, color: typo.titoloColor, letterSpacing: titoloLS })}
          </View>
          {cov.sottotitolo ? (
            <View style={{ width: '100%', alignItems: alignToFlex(subtitleAlign), marginBottom: subtitle2 ? spacingS2 : 0 }}>
              {renderCoverLines(cov.sottotitolo, { fontSize: typo.sottotitoloFontSize, fontFamily: subtitleFont, color: typo.sottotitoloColor, letterSpacing: sottotitoloLS })}
            </View>
          ) : null}
          {subtitle2 ? (
            <View style={{ width: '100%', alignItems: alignToFlex(subtitle2Align) }}>
              {renderCoverLines(subtitle2, { fontSize: typo.sottotitolo2FontSize ?? 11, fontFamily: subtitle2Font, color: typo.sottotitolo2Color ?? typo.sottotitoloColor, letterSpacing: sottotitoloLS })}
            </View>
          ) : null}
        </View>
        {renderCoverLogo2(cov, pageW, pageH)}
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
          <Image src={coverLogoBase64} style={{ height: logoH }} />
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
      <View style={{ width: '100%', alignItems: alignToFlex(titleAlign), marginBottom: spacingTS }}>
        {renderCoverLines(titoloText, { fontSize: typo.titoloFontSize, fontFamily: titleFont, color: typo.titoloColor, letterSpacing: titoloLS })}
      </View>
      {cov.sottotitolo ? (
        <View style={{ width: '100%', alignItems: alignToFlex(subtitleAlign), marginBottom: subtitle2 ? spacingS2 : 0 }}>
          {renderCoverLines(cov.sottotitolo, { fontSize: typo.sottotitoloFontSize, fontFamily: subtitleFont, color: typo.sottotitoloColor, letterSpacing: sottotitoloLS })}
        </View>
      ) : null}
      {subtitle2 ? (
        <View style={{ width: '100%', alignItems: alignToFlex(subtitle2Align) }}>
          {renderCoverLines(subtitle2, { fontSize: typo.sottotitolo2FontSize ?? 11, fontFamily: subtitle2Font, color: typo.sottotitolo2Color ?? typo.sottotitoloColor, letterSpacing: sottotitoloLS })}
        </View>
      ) : null}
      {renderCoverLogo2(cov, pageW, pageH)}
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

function renderTitleInlines(inlines: HtmlInline[], typo: FinalPageTypography, titleAlign: 'left' | 'center' | 'right', mb = 18) {
  if (inlines.length === 0) return null;
  const marginBottom = typo.titoloMarginBottom ?? mb;
  const baseFam = resolveFamily(typo.titoloFontFamily ?? 'helvetica');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const decoration: any = typo.titoloUnderline ? 'underline' : undefined;
  return (
    <View style={{ width: '100%', alignItems: alignToFlex(titleAlign), marginBottom, ...(typo.titoloHighlight ? { backgroundColor: typo.titoloHighlight } : {}) }}>
      <Text style={{ fontSize: typo.titoloFontSize, color: typo.titoloColor, letterSpacing: 2, ...(decoration ? { textDecoration: decoration } : {}) }}>
        {inlines.map((seg, i) => {
          const bold = typo.titoloBold || seg.bold;
          const italic = typo.titoloItalic || seg.italic;
          const fam = baseFam === 'Helvetica'
            ? ((bold && italic) ? 'Helvetica-BoldOblique' : bold ? 'Helvetica-Bold' : italic ? 'Helvetica-Oblique' : 'Helvetica')
            : (bold ? `${baseFam}-Bold` : baseFam);
          const text = typo.titoloUppercase ? seg.text.toUpperCase() : seg.text;
          return (
            <Text key={i} style={{ fontFamily: fam, color: typo.titoloColor }}>{text}</Text>
          );
        })}
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

function renderLogo2Inline(
  page: { logo2Tipo?: string; logo2CustomBase64?: string | null; logo2PosX?: string; logo2Dimensione?: string },
) {
  if (!page.logo2Tipo || page.logo2Tipo === 'none') return null;
  const src = page.logo2CustomBase64;
  if (!src) return null;
  const h = FINAL_LOGO_H[page.logo2Dimensione ?? 'medio'] ?? 22;
  const justify: 'flex-start' | 'center' | 'flex-end' =
    page.logo2PosX === 'center' ? 'center' : page.logo2PosX === 'right' ? 'flex-end' : 'flex-start';
  return (
    <View style={{ width: '100%', flexDirection: 'row', justifyContent: justify, marginBottom: 10 }}>
      <Image src={src} style={{ height: h }} />
    </View>
  );
}

function renderCoverLogo2(
  cov: { logo2Tipo?: string; logo2CustomBase64?: string | null; logo2PosX?: string; logo2PosY?: string; logo2Dimensione?: string },
  pageW: number,
  pageH: number,
) {
  if (!cov.logo2Tipo || cov.logo2Tipo === 'none') return null;
  const src = cov.logo2CustomBase64;
  if (!src) return null;
  const h = FINAL_LOGO_H[cov.logo2Dimensione ?? 'medio'] ?? 22;
  const justify: 'flex-start' | 'center' | 'flex-end' =
    (cov.logo2PosX ?? 'right') === 'center' ? 'center' : (cov.logo2PosX ?? 'right') === 'right' ? 'flex-end' : 'flex-start';
  const MARGIN = 30;
  const posY = cov.logo2PosY ?? 'bottom';
  const top = posY === 'top' ? MARGIN : posY === 'middle' ? pageH / 2 - h / 2 : pageH - h - MARGIN;
  return (
    <View style={{ position: 'absolute', top, left: MARGIN, right: MARGIN, flexDirection: 'row', justifyContent: justify }}>
      <Image src={src} style={{ height: h }} />
    </View>
  );
}

function renderSezione3(page: { sezioneFinale3Attiva?: boolean; sezioneFinale3Html?: string; sezioneFinale3FontSize?: number; sezioneFinale3Colore?: string; sezioneFinale3Align?: 'left' | 'center' | 'right' }, padH: number) {
  if (!page.sezioneFinale3Attiva || !page.sezioneFinale3Html?.trim()) return null;
  const blocks = parseHtmlToPdf(page.sezioneFinale3Html);
  if (blocks.length === 0) return null;
  const align = page.sezioneFinale3Align ?? 'center';
  return (
    <View style={{ position: 'absolute', bottom: 20, left: padH, right: padH }}>
      {renderHtmlBlocks(blocks, { fontSize: page.sezioneFinale3FontSize ?? 8, color: page.sezioneFinale3Colore ?? '#9CA3AF', defaultAlign: align })}
    </View>
  );
}

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

  const legacyLayoutMap: Record<string, string> = {
    top: 'img-top', center: 'img-top', bottom: 'img-bottom', background: 'background',
  };
  const resolvedLayout: string = pf.layout ?? legacyLayoutMap[pf.immaginePosition ?? ''] ?? 'img-top';

  const imgScale = pf.imgScale ?? 100;
  const imgOffsetX = pf.imgOffsetX ?? 0;
  const imgOffsetY = pf.imgOffsetY ?? 0;
  const imgOpacity = (pf.imgOpacity ?? 100) / 100;

  const finalLogoBase64 = resolveFinalLogo(pf, config.logoBase64);
  const logoDim = pf.logoDimensione ?? 'medio';
  const logoH = FINAL_LOGO_H[logoDim] ?? 22;
  const logoPosX = pf.logoPosX ?? 'center';
  const logoPosY = pf.logoPosY ?? 'bottom';
  const logoJustify: 'flex-start' | 'center' | 'flex-end' =
    logoPosX === 'center' ? 'center' : logoPosX === 'right' ? 'flex-end' : 'flex-start';
  const LOGO_MARGIN = 30;
  const logoVertical: Record<string, number> = {
    top: LOGO_MARGIN, middle: pageH / 2 - logoH / 2, bottom: pageH - logoH - LOGO_MARGIN,
  };
  const logoTop = logoVertical[logoPosY] ?? (pageH - logoH - LOGO_MARGIN);

  const logoView = finalLogoBase64 ? (
    <View style={{ position: 'absolute', top: logoTop, left: LOGO_MARGIN, right: LOGO_MARGIN, flexDirection: 'row', justifyContent: logoJustify }}>
      <Image src={finalLogoBase64} style={{ height: logoH }} />
    </View>
  ) : null;

  const bgW = pageW * imgScale / 100;
  const bgH = pageH * imgScale / 100;
  const bgLeft = (pageW - bgW) / 2 + (pageW * imgOffsetX / 100);
  const bgTop = (pageH - bgH) / 2 + (pageH * imgOffsetY / 100);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bgImg = imgSrc ? <View style={{ position: 'absolute' as const, top: bgTop, left: bgLeft, width: bgW, height: bgH, overflow: 'hidden' }}><Image src={imgSrc} style={{ width: bgW, height: bgH, objectFit: 'cover' as any }} /></View> : null;

  const PAD_H = 60;
  const PAD_V = 48;
  const mt = typo.marginTop ?? PAD_V;
  const s1mb = typo.sezione1MarginBottom ?? 0;
  const textBg = pf.testoSfondoColore || undefined;

  // logo2 inline elements
  const logo2Pos = pf.logo2Posizione ?? 'below-text';
  const logo2Above = logo2Pos === 'above-title' ? renderLogo2Inline(pf) : null;
  const logo2Between = logo2Pos === 'between' ? renderLogo2Inline(pf) : null;
  const logo2Below = logo2Pos === 'below-text' ? renderLogo2Inline(pf) : null;

  if (resolvedLayout === 'full-overlay') {
    return (
      <Page size={[pageW, pageH] as [number, number]} style={{ fontFamily: resolveFamily(config.fontFamiglia), backgroundColor: config.colori.sfondoPagina }}>
        {bgImg}
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: pageH * 0.45, backgroundColor: 'rgba(0,0,0,0.55)' }} />
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: pageH * 0.45, justifyContent: 'flex-end', paddingHorizontal: PAD_H, paddingBottom: PAD_V, backgroundColor: textBg }}>
          {logo2Above}
          {renderTitleInlines(titleInlines, typo, titleAlign, 8)}
          {logo2Between}
          {bodyBlocks.length > 0 ? (
            <View style={{ width: '100%', marginBottom: s1mb }}>
              {renderHtmlBlocks(bodyBlocks, { fontSize: typo.testoFontSize, color: typo.testoColor, defaultAlign: textAlign, bold: typo.testoBold, italic: typo.testoItalic, underline: typo.testoUnderline, uppercase: typo.testoUppercase, fontFamily: typo.testoFontFamily })}
            </View>
          ) : null}
          {logo2Below}
        </View>
        {logoView}
        {renderSezione3(pf, PAD_H)}
      </Page>
    );
  }

  if (resolvedLayout === 'background') {
    return (
      <Page size={[pageW, pageH] as [number, number]} style={{ fontFamily: resolveFamily(config.fontFamiglia), backgroundColor: config.colori.sfondoPagina }}>
        {bgImg}
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', paddingHorizontal: PAD_H, paddingTop: mt, paddingBottom: PAD_V, backgroundColor: textBg }}>
          {logo2Above}
          {renderTitleInlines(titleInlines, typo, titleAlign)}
          {logo2Between}
          {bodyBlocks.length > 0 ? (
            <View style={{ width: '100%', marginBottom: s1mb }}>
              {renderHtmlBlocks(bodyBlocks, { fontSize: typo.testoFontSize, color: typo.testoColor, defaultAlign: textAlign, bold: typo.testoBold, italic: typo.testoItalic, underline: typo.testoUnderline, uppercase: typo.testoUppercase, fontFamily: typo.testoFontFamily })}
            </View>
          ) : null}
          {logo2Below}
        </View>
        {logoView}
        {renderSezione3(pf, PAD_H)}
      </Page>
    );
  }

  if (resolvedLayout === 'img-only') {
    return (
      <Page size={[pageW, pageH] as [number, number]} style={{ fontFamily: resolveFamily(config.fontFamiglia), backgroundColor: config.colori.sfondoPagina }}>
        {bgImg}
        {logoView}
        {renderSezione3(pf, PAD_H)}
      </Page>
    );
  }

  if (resolvedLayout === 'img-left') {
    const imgAreaW = pageW * 0.45;
    const imgW = imgAreaW * imgScale / 100;
    const imgH = pageH * imgScale / 100;
    const imgLeft = (imgAreaW - imgW) / 2 + (imgAreaW * imgOffsetX / 100);
    const imgTop = (pageH - imgH) / 2 + (pageH * imgOffsetY / 100);
    return (
      <Page size={[pageW, pageH] as [number, number]} style={{ fontFamily: resolveFamily(config.fontFamiglia), backgroundColor: config.colori.sfondoPagina, flexDirection: 'row' }}>
        <View style={{ width: imgAreaW, height: pageH, overflow: 'hidden' }}>
          {imgSrc && (
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            <Image src={imgSrc} style={{ position: 'absolute', top: imgTop, left: imgLeft, width: imgW, height: imgH, objectFit: 'cover' as any }} />
          )}
        </View>
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 32, paddingTop: mt, paddingBottom: PAD_V, backgroundColor: textBg }}>
          {logo2Above}
          {renderTitleInlines(titleInlines, typo, titleAlign)}
          {logo2Between}
          {bodyBlocks.length > 0 ? (
            <View style={{ width: '100%', marginBottom: s1mb }}>
              {renderHtmlBlocks(bodyBlocks, { fontSize: typo.testoFontSize, color: typo.testoColor, defaultAlign: textAlign, bold: typo.testoBold, italic: typo.testoItalic, underline: typo.testoUnderline, uppercase: typo.testoUppercase, fontFamily: typo.testoFontFamily })}
            </View>
          ) : null}
          {logo2Below}
        </View>
        {logoView}
        {renderSezione3(pf, 32)}
      </Page>
    );
  }

  if (resolvedLayout === 'img-bottom') {
    const imgAreaH = pageH * 0.4;
    const textAreaH = pageH - imgAreaH;
    const imgW = pageW * imgScale / 100;
    const imgH = imgAreaH * imgScale / 100;
    const imgLeft = (pageW - imgW) / 2 + (pageW * imgOffsetX / 100);
    const imgTop = (imgAreaH - imgH) / 2 + (imgAreaH * imgOffsetY / 100);
    return (
      <Page size={[pageW, pageH] as [number, number]} style={{ fontFamily: resolveFamily(config.fontFamiglia), backgroundColor: config.colori.sfondoPagina }}>
        <View style={{ height: textAreaH, justifyContent: 'center', paddingHorizontal: PAD_H, paddingTop: mt, paddingBottom: PAD_V, backgroundColor: textBg }}>
          {logo2Above}
          {renderTitleInlines(titleInlines, typo, titleAlign)}
          {logo2Between}
          {bodyBlocks.length > 0 ? (
            <View style={{ width: '100%', marginBottom: s1mb }}>
              {renderHtmlBlocks(bodyBlocks, { fontSize: typo.testoFontSize, color: typo.testoColor, defaultAlign: textAlign, bold: typo.testoBold, italic: typo.testoItalic, underline: typo.testoUnderline, uppercase: typo.testoUppercase, fontFamily: typo.testoFontFamily })}
            </View>
          ) : null}
          {logo2Below}
        </View>
        <View style={{ height: imgAreaH, overflow: 'hidden' }}>
          {imgSrc && (
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            <Image src={imgSrc} style={{ position: 'absolute', top: imgTop, left: imgLeft, width: imgW, height: imgH, objectFit: 'cover' as any }} />
          )}
        </View>
        {logoView}
        {renderSezione3(pf, PAD_H)}
      </Page>
    );
  }

  // img-top (default)
  const imgAreaH = pageH * 0.4;
  const textAreaH = pageH - imgAreaH;
  const imgW = pageW * imgScale / 100;
  const imgH = imgAreaH * imgScale / 100;
  const imgLeft = (pageW - imgW) / 2 + (pageW * imgOffsetX / 100);
  const imgTop = (imgAreaH - imgH) / 2 + (imgAreaH * imgOffsetY / 100);
  return (
    <Page size={[pageW, pageH] as [number, number]} style={{ fontFamily: resolveFamily(config.fontFamiglia), backgroundColor: config.colori.sfondoPagina }}>
      <View style={{ height: imgAreaH, overflow: 'hidden' }}>
        {imgSrc && (
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          <Image src={imgSrc} style={{ position: 'absolute', top: imgTop, left: imgLeft, width: imgW, height: imgH, objectFit: 'cover' as any }} />
        )}
      </View>
      <View style={{ height: textAreaH, justifyContent: 'center', paddingHorizontal: PAD_H, paddingTop: mt, paddingBottom: PAD_V, backgroundColor: textBg }}>
        {logo2Above}
        {renderTitleInlines(titleInlines, typo, titleAlign)}
        {logo2Between}
        {bodyBlocks.length > 0 ? (
          <View style={{ width: '100%', marginBottom: s1mb }}>
            {renderHtmlBlocks(bodyBlocks, { fontSize: typo.testoFontSize, color: typo.testoColor, defaultAlign: textAlign, bold: typo.testoBold, italic: typo.testoItalic, underline: typo.testoUnderline, uppercase: typo.testoUppercase, fontFamily: typo.testoFontFamily })}
          </View>
        ) : null}
        {logo2Below}
      </View>
      {logoView}
      {renderSezione3(pf, PAD_H)}
    </Page>
  );
}

function resolvePenultimaLogo(pp: NonNullable<CatalogConfig['paginaPenultima']>, headerLogoBase64: string | null): string | null {
  const logoTipo = pp.logoTipo ?? (pp.mostraLogo ? 'onearth' : 'none');
  if (logoTipo === 'none') return null;
  if (logoTipo === 'custom') return pp.logoCustomBase64 ?? null;
  return headerLogoBase64;
}

function PenultimaPage({
  config,
  layout,
}: {
  config: CatalogConfig;
  layout: Layout;
}) {
  const pp = config.paginaPenultima!;
  const typo = config.paginaPenultimaTypo ?? config.paginaFinaleTypo;
  const { pageW, pageH } = layout;
  const titleAlign = pp.titoloAllineamento ?? 'center';
  const textAlign = pp.testoAllineamento ?? 'center';

  const titleInlines = parseTitleInlines(pp.titolo, typo);
  const bodyBlocks = parseHtmlToPdf(pp.testo ?? '');

  const imgSrc = pp.immagineBase64 ?? null;

  const resolvedLayout: string = pp.layout ?? 'img-top';

  const imgScale = pp.imgScale ?? 100;
  const imgOffsetX = pp.imgOffsetX ?? 0;
  const imgOffsetY = pp.imgOffsetY ?? 0;
  const imgOpacity = (pp.imgOpacity ?? 100) / 100;

  const penultimaLogoBase64 = resolvePenultimaLogo(pp, config.logoBase64);
  const logoDim = pp.logoDimensione ?? 'medio';
  const logoH = FINAL_LOGO_H[logoDim] ?? 22;
  const logoPosX = pp.logoPosX ?? 'center';
  const logoPosY = pp.logoPosY ?? 'bottom';
  const logoJustify: 'flex-start' | 'center' | 'flex-end' =
    logoPosX === 'center' ? 'center' : logoPosX === 'right' ? 'flex-end' : 'flex-start';
  const LOGO_MARGIN = 30;
  const logoVertical: Record<string, number> = {
    top: LOGO_MARGIN, middle: pageH / 2 - logoH / 2, bottom: pageH - logoH - LOGO_MARGIN,
  };
  const logoTop = logoVertical[logoPosY] ?? (pageH - logoH - LOGO_MARGIN);

  const logoView = penultimaLogoBase64 ? (
    <View style={{ position: 'absolute', top: logoTop, left: LOGO_MARGIN, right: LOGO_MARGIN, flexDirection: 'row', justifyContent: logoJustify }}>
      <Image src={penultimaLogoBase64} style={{ height: logoH }} />
    </View>
  ) : null;

  const bgW = pageW * imgScale / 100;
  const bgH = pageH * imgScale / 100;
  const bgLeft = (pageW - bgW) / 2 + (pageW * imgOffsetX / 100);
  const bgTop = (pageH - bgH) / 2 + (pageH * imgOffsetY / 100);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bgImg = imgSrc ? <View style={{ position: 'absolute' as const, top: bgTop, left: bgLeft, width: bgW, height: bgH, overflow: 'hidden' }}><Image src={imgSrc} style={{ width: bgW, height: bgH, objectFit: 'cover' as any }} /></View> : null;

  const PAD_H = 60;
  const PAD_V = 48;
  const mt = typo.marginTop ?? PAD_V;
  const s1mb = typo.sezione1MarginBottom ?? 0;
  const textBg = pp.testoSfondoColore || undefined;

  const logo2Pos = pp.logo2Posizione ?? 'below-text';
  const logo2Above = logo2Pos === 'above-title' ? renderLogo2Inline(pp) : null;
  const logo2Between = logo2Pos === 'between' ? renderLogo2Inline(pp) : null;
  const logo2Below = logo2Pos === 'below-text' ? renderLogo2Inline(pp) : null;

  if (resolvedLayout === 'full-overlay') {
    return (
      <Page size={[pageW, pageH] as [number, number]} style={{ fontFamily: resolveFamily(config.fontFamiglia), backgroundColor: config.colori.sfondoPagina }}>
        {bgImg}
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: pageH * 0.45, backgroundColor: 'rgba(0,0,0,0.55)' }} />
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: pageH * 0.45, justifyContent: 'flex-end', paddingHorizontal: PAD_H, paddingBottom: PAD_V, backgroundColor: textBg }}>
          {logo2Above}
          {renderTitleInlines(titleInlines, typo, titleAlign, 8)}
          {logo2Between}
          {bodyBlocks.length > 0 ? (
            <View style={{ width: '100%', marginBottom: s1mb }}>
              {renderHtmlBlocks(bodyBlocks, { fontSize: typo.testoFontSize, color: typo.testoColor, defaultAlign: textAlign, bold: typo.testoBold, italic: typo.testoItalic, underline: typo.testoUnderline, uppercase: typo.testoUppercase, fontFamily: typo.testoFontFamily })}
            </View>
          ) : null}
          {logo2Below}
        </View>
        {logoView}
        {renderSezione3(pp, PAD_H)}
      </Page>
    );
  }

  if (resolvedLayout === 'background') {
    return (
      <Page size={[pageW, pageH] as [number, number]} style={{ fontFamily: resolveFamily(config.fontFamiglia), backgroundColor: config.colori.sfondoPagina }}>
        {bgImg}
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', paddingHorizontal: PAD_H, paddingTop: mt, paddingBottom: PAD_V, backgroundColor: textBg }}>
          {logo2Above}
          {renderTitleInlines(titleInlines, typo, titleAlign)}
          {logo2Between}
          {bodyBlocks.length > 0 ? (
            <View style={{ width: '100%', marginBottom: s1mb }}>
              {renderHtmlBlocks(bodyBlocks, { fontSize: typo.testoFontSize, color: typo.testoColor, defaultAlign: textAlign, bold: typo.testoBold, italic: typo.testoItalic, underline: typo.testoUnderline, uppercase: typo.testoUppercase, fontFamily: typo.testoFontFamily })}
            </View>
          ) : null}
          {logo2Below}
        </View>
        {logoView}
        {renderSezione3(pp, PAD_H)}
      </Page>
    );
  }

  if (resolvedLayout === 'img-only') {
    return (
      <Page size={[pageW, pageH] as [number, number]} style={{ fontFamily: resolveFamily(config.fontFamiglia), backgroundColor: config.colori.sfondoPagina }}>
        {bgImg}
        {logoView}
        {renderSezione3(pp, PAD_H)}
      </Page>
    );
  }

  if (resolvedLayout === 'img-left') {
    const imgAreaW = pageW * 0.45;
    const imgW = imgAreaW * imgScale / 100;
    const imgH = pageH * imgScale / 100;
    const imgLeft = (imgAreaW - imgW) / 2 + (imgAreaW * imgOffsetX / 100);
    const imgTop = (pageH - imgH) / 2 + (pageH * imgOffsetY / 100);
    return (
      <Page size={[pageW, pageH] as [number, number]} style={{ fontFamily: resolveFamily(config.fontFamiglia), backgroundColor: config.colori.sfondoPagina, flexDirection: 'row' }}>
        <View style={{ width: imgAreaW, height: pageH, overflow: 'hidden' }}>
          {imgSrc && (
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            <Image src={imgSrc} style={{ position: 'absolute', top: imgTop, left: imgLeft, width: imgW, height: imgH, objectFit: 'cover' as any }} />
          )}
        </View>
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 32, paddingTop: mt, paddingBottom: PAD_V, backgroundColor: textBg }}>
          {logo2Above}
          {renderTitleInlines(titleInlines, typo, titleAlign)}
          {logo2Between}
          {bodyBlocks.length > 0 ? (
            <View style={{ width: '100%', marginBottom: s1mb }}>
              {renderHtmlBlocks(bodyBlocks, { fontSize: typo.testoFontSize, color: typo.testoColor, defaultAlign: textAlign, bold: typo.testoBold, italic: typo.testoItalic, underline: typo.testoUnderline, uppercase: typo.testoUppercase, fontFamily: typo.testoFontFamily })}
            </View>
          ) : null}
          {logo2Below}
        </View>
        {logoView}
        {renderSezione3(pp, 32)}
      </Page>
    );
  }

  if (resolvedLayout === 'img-bottom') {
    const imgAreaH = pageH * 0.4;
    const textAreaH = pageH - imgAreaH;
    const imgW = pageW * imgScale / 100;
    const imgH = imgAreaH * imgScale / 100;
    const imgLeft = (pageW - imgW) / 2 + (pageW * imgOffsetX / 100);
    const imgTop = (imgAreaH - imgH) / 2 + (imgAreaH * imgOffsetY / 100);
    return (
      <Page size={[pageW, pageH] as [number, number]} style={{ fontFamily: resolveFamily(config.fontFamiglia), backgroundColor: config.colori.sfondoPagina }}>
        <View style={{ height: textAreaH, justifyContent: 'center', paddingHorizontal: PAD_H, paddingTop: mt, paddingBottom: PAD_V, backgroundColor: textBg }}>
          {logo2Above}
          {renderTitleInlines(titleInlines, typo, titleAlign)}
          {logo2Between}
          {bodyBlocks.length > 0 ? (
            <View style={{ width: '100%', marginBottom: s1mb }}>
              {renderHtmlBlocks(bodyBlocks, { fontSize: typo.testoFontSize, color: typo.testoColor, defaultAlign: textAlign, bold: typo.testoBold, italic: typo.testoItalic, underline: typo.testoUnderline, uppercase: typo.testoUppercase, fontFamily: typo.testoFontFamily })}
            </View>
          ) : null}
          {logo2Below}
        </View>
        <View style={{ height: imgAreaH, overflow: 'hidden' }}>
          {imgSrc && (
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            <Image src={imgSrc} style={{ position: 'absolute', top: imgTop, left: imgLeft, width: imgW, height: imgH, objectFit: 'cover' as any }} />
          )}
        </View>
        {logoView}
        {renderSezione3(pp, PAD_H)}
      </Page>
    );
  }

  // img-top (default)
  const imgAreaH = pageH * 0.4;
  const textAreaH = pageH - imgAreaH;
  const imgW = pageW * imgScale / 100;
  const imgH = imgAreaH * imgScale / 100;
  const imgLeft = (pageW - imgW) / 2 + (pageW * imgOffsetX / 100);
  const imgTop = (imgAreaH - imgH) / 2 + (imgAreaH * imgOffsetY / 100);
  return (
    <Page size={[pageW, pageH] as [number, number]} style={{ fontFamily: resolveFamily(config.fontFamiglia), backgroundColor: config.colori.sfondoPagina }}>
      <View style={{ height: imgAreaH, overflow: 'hidden' }}>
        {imgSrc && (
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          <Image src={imgSrc} style={{ position: 'absolute', top: imgTop, left: imgLeft, width: imgW, height: imgH, objectFit: 'cover' as any }} />
        )}
      </View>
      <View style={{ height: textAreaH, justifyContent: 'center', paddingHorizontal: PAD_H, paddingTop: mt, paddingBottom: PAD_V, backgroundColor: textBg }}>
        {logo2Above}
        {renderTitleInlines(titleInlines, typo, titleAlign)}
        {logo2Between}
        {bodyBlocks.length > 0 ? (
          <View style={{ width: '100%', marginBottom: s1mb }}>
            {renderHtmlBlocks(bodyBlocks, { fontSize: typo.testoFontSize, color: typo.testoColor, defaultAlign: textAlign, bold: typo.testoBold, italic: typo.testoItalic, underline: typo.testoUnderline, uppercase: typo.testoUppercase, fontFamily: typo.testoFontFamily })}
          </View>
        ) : null}
        {logo2Below}
      </View>
      {logoView}
      {renderSezione3(pp, PAD_H)}
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

// ── Tranche separator page ────────────────────────────────────────────────────

function TrancheSeparatorPage({
  tranche, productCount, config, layout, today,
}: {
  tranche: string; productCount: number; config: CatalogConfig; layout: Layout; today: string;
}) {
  const st: TrancheSeparatoreStyle = config.stileSeparatoreTranche ?? {
    bgColor: '#1C1C1C', color: '#FFFFFF', fontSize: 36, bold: true, uppercase: true, mostraNProdotti: true,
  };
  const font = st.bold ? 'Helvetica-Bold' : 'Helvetica';
  const displayName = st.uppercase ? tranche.toUpperCase() : tranche;
  const { pageW, pageH } = layout;

  return (
    <Page size={[pageW, pageH] as [number, number]} style={{ fontFamily: 'Helvetica', backgroundColor: st.bgColor, paddingTop: 20, paddingBottom: 20, paddingLeft: 20, paddingRight: 20 }}>
      <CatalogHeader config={config} today={today} layout={layout} />
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 }}>
        <View style={{ width: 60, height: 2, backgroundColor: hexToRgba(st.color, 0.6), marginBottom: 20 }} />
        <Text style={{ fontSize: st.fontSize, fontFamily: font, color: st.color, letterSpacing: 4, textAlign: 'center' }}>
          {displayName}
        </Text>
        {st.mostraNProdotti && (
          <Text style={{ fontSize: 11, fontFamily: 'Helvetica', color: hexToRgba(st.color, 0.6), marginTop: 20, letterSpacing: 2 }}>
            {productCount} {productCount === 1 ? 'prodotto' : 'prodotti'}
          </Text>
        )}
      </View>
      <CatalogFooter config={config} layout={layout} />
    </Page>
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
  const renderInlineOrNewRow = (groupsToRender: GroupForPDF[]) => {
    const isNewRow = separatorMode === 'nuova-riga';
    return (
      <Page size={[pageW, pageH] as [number, number]} style={pageStyle}>
        <CatalogHeader config={config} today={today} layout={layout} />
        {groupsToRender.map((group, gi) => {
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

  const renderGroupsInMode = (groupsToRender: GroupForPDF[], showSep: boolean) => {
    if (separatorMode === 'pagina-intera') {
      return groupsToRender.map((group, gi) => (
        <React.Fragment key={gi}>
          {showSep && group.key && (
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
      ));
    }
    return renderInlineOrNewRow(groupsToRender);
  };

  const trancheGroups = config.trancheGroups;
  const useTrancheMode = config.suddividiPerTranche && trancheGroups && trancheGroups.length > 0;

  return (
    <Document>
      {/* Cover page */}
      {config.copertina.attiva && (
        <CoverPage config={config} layout={layout} />
      )}

      {/* Product pages */}
      {useTrancheMode ? (
        trancheGroups!.map((tg, ti) => (
          <React.Fragment key={ti}>
            {config.separatoreTrancheAttivo !== false && (
              <TrancheSeparatorPage
                tranche={tg.tranche}
                productCount={tg.productCount}
                config={config}
                layout={layout}
                today={today}
              />
            )}
            {renderGroupsInMode(tg.groups, true)}
          </React.Fragment>
        ))
      ) : separatorMode === 'pagina-intera' ? (
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
        renderInlineOrNewRow(groups)
      )}

      {/* Penultima page */}
      {config.paginaPenultima?.attiva && (
        <PenultimaPage config={config} layout={layout} />
      )}

      {/* Final page */}
      {config.paginaFinale.attiva && (
        <FinalPage config={config} layout={layout} />
      )}
    </Document>
  );
}
