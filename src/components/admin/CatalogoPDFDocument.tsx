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

// ── Layout constants ───────────────────────────────────────────────────────────

const H_PAD = 20;
const V_PAD_TOP = 52;
const V_PAD_BOT = 24;
const USABLE_W = 595 - H_PAD * 2; // 555
const COLS = 4;
const CARD_W = Math.floor(USABLE_W / COLS); // 138
const CARD_H = 127; // (842 - 52 - 24) / 6 = 127.67
const IMG_H = 70;

// ── Palette ───────────────────────────────────────────────────────────────────

const C = {
  primary: '#1C1C1C',
  accent: '#8B7355',
  cream: '#F5F2EE',
  border: '#E5E0D8',
  muted: '#9CA3AF',
  placeholder: '#D4CEC7',
  white: '#FFFFFF',
};

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    paddingTop: V_PAD_TOP,
    paddingBottom: V_PAD_BOT,
    paddingLeft: H_PAD,
    paddingRight: H_PAD,
    backgroundColor: C.white,
  },
  separatorPage: {
    fontFamily: 'Helvetica',
    paddingTop: 20,
    paddingBottom: 20,
    paddingLeft: H_PAD,
    paddingRight: H_PAD,
    backgroundColor: C.cream,
  },
  // Fixed header
  header: {
    position: 'absolute',
    top: 10,
    left: H_PAD,
    right: H_PAD,
    height: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomColor: C.border,
    borderBottomWidth: 0.5,
    paddingBottom: 6,
  },
  headerLeft: { width: 100 },
  headerLogo: { height: 14, width: 90 },
  headerBrand: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 2.5,
    color: C.primary,
  },
  headerTitle: {
    fontSize: 8,
    color: C.primary,
    letterSpacing: 0.5,
    textAlign: 'center',
    flex: 1,
    paddingHorizontal: 8,
  },
  headerRight: { width: 100, alignItems: 'flex-end' },
  headerDate: { fontSize: 7, color: C.muted },
  // Fixed footer
  footer: {
    position: 'absolute',
    bottom: 8,
    left: H_PAD,
    right: H_PAD,
    borderTopColor: C.border,
    borderTopWidth: 0.5,
    paddingTop: 3,
    alignItems: 'center',
  },
  footerText: { fontSize: 6.5, color: C.muted },
  // Grid
  row: { flexDirection: 'row' },
  cell: {
    width: CARD_W,
    height: CARD_H,
    borderColor: C.border,
    borderWidth: 0.5,
    overflow: 'hidden',
  },
  emptyCell: { width: CARD_W, height: CARD_H },
  // Image area
  imgContainer: {
    width: CARD_W - 1,
    height: IMG_H,
    backgroundColor: '#F0EDE8',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  productImg: {
    width: CARD_W - 1,
    height: IMG_H,
    objectFit: 'contain',
  },
  placeholderLogo: {
    width: 55,
    height: 12,
    objectFit: 'contain',
    opacity: 0.25,
  },
  // Text area
  textArea: {
    padding: 4,
    flex: 1,
  },
  code: {
    fontSize: 6.5,
    color: C.muted,
    marginBottom: 1.5,
    letterSpacing: 0.3,
  },
  desc: {
    fontSize: 7,
    color: C.primary,
    lineHeight: 1.25,
    marginBottom: 2,
  },
  detail: {
    fontSize: 6,
    color: C.muted,
    marginBottom: 2,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 3,
  },
  priceItem: { alignItems: 'flex-start' },
  priceLabel: {
    fontSize: 5.5,
    color: C.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 1,
  },
  priceValue: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: C.primary,
  },
  // Separator page
  separatorContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  separatorAccentLine: {
    width: 50,
    height: 1.5,
    backgroundColor: C.accent,
    marginBottom: 14,
  },
  separatorTitle: {
    fontSize: 26,
    fontFamily: 'Helvetica-Bold',
    color: C.primary,
    letterSpacing: 3,
    textAlign: 'center',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  separatorCount: {
    fontSize: 10,
    color: C.muted,
    textAlign: 'center',
    letterSpacing: 1.5,
  },
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function euro(n: number) {
  return '€' + n.toFixed(2).replace('.', ',');
}

// ── Sub-components ────────────────────────────────────────────────────────────

function CatalogHeader({ config, today }: { config: CatalogConfig; today: string }) {
  return (
    <View style={s.header} fixed>
      <View style={s.headerLeft}>
        {config.mostraLogo && config.logoBase64 ? (
          <Image style={s.headerLogo} src={config.logoBase64} />
        ) : (
          <Text style={s.headerBrand}>ON EARTH</Text>
        )}
      </View>
      <Text style={s.headerTitle}>{config.titolo}</Text>
      <View style={s.headerRight}>
        {config.mostraData && <Text style={s.headerDate}>{today}</Text>}
      </View>
    </View>
  );
}

function CatalogFooter({ config }: { config: CatalogConfig }) {
  if (!config.mostraPagina) return null;
  return (
    <View style={s.footer} fixed>
      <Text
        style={s.footerText}
        render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
      />
    </View>
  );
}

function ProductCard({
  product,
  config,
  isEmpty = false,
}: {
  product?: ProductForPDF;
  config: CatalogConfig;
  isEmpty?: boolean;
}) {
  if (isEmpty || !product) {
    return <View style={s.emptyCell} />;
  }

  const f = config.campi;

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
    <View style={s.cell}>
      {f.foto && (
        <View style={s.imgContainer}>
          {product.imageDataUri ? (
            <Image style={s.productImg} src={product.imageDataUri} />
          ) : config.logoBase64 ? (
            <Image style={s.placeholderLogo} src={config.logoBase64} />
          ) : null}
        </View>
      )}
      <View style={s.textArea}>
        {f.codice && <Text style={s.code}>{product.code}</Text>}
        {f.descrizione && (
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          <Text style={s.desc} {...({ numberOfLines: 2 } as any)}>
            {product.description || product.name}
          </Text>
        )}
        {detailStr.length > 0 && (
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          <Text style={s.detail} {...({ numberOfLines: 1 } as any)}>
            {detailStr}
          </Text>
        )}
        {(f.prezzoCosto || f.pvp) && (
          <View style={s.priceRow}>
            {f.prezzoCosto && (
              <View style={s.priceItem}>
                <Text style={s.priceLabel}>Costo i.e.</Text>
                <Text style={s.priceValue}>{euro(product.costPrice)}</Text>
              </View>
            )}
            {f.pvp && (
              <View style={s.priceItem}>
                <Text style={s.priceLabel}>PVP i.i.</Text>
                <Text style={s.priceValue}>{euro(product.retailPrice)}</Text>
              </View>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

function ProductGrid({ products, config }: { products: ProductForPDF[]; config: CatalogConfig }) {
  const rows: (ProductForPDF | null)[][] = [];
  for (let i = 0; i < products.length; i += COLS) {
    const row: (ProductForPDF | null)[] = products.slice(i, i + COLS);
    while (row.length < COLS) row.push(null);
    rows.push(row);
  }
  return (
    <View>
      {rows.map((row, ri) => (
        <View key={ri} style={s.row} wrap={false}>
          {row.map((p, ci) =>
            p ? (
              <ProductCard key={p.id} product={p} config={config} />
            ) : (
              <ProductCard key={`e${ci}`} isEmpty config={config} />
            )
          )}
        </View>
      ))}
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
  const hasGrouping = !!config.raggruppa;

  return (
    <Document>
      {groups.map((group, gi) => (
        <React.Fragment key={gi}>
          {hasGrouping && (
            <Page size="A4" style={s.separatorPage}>
              <CatalogHeader config={config} today={today} />
              <View style={s.separatorContent}>
                <View style={s.separatorAccentLine} />
                <Text style={s.separatorTitle}>{group.key}</Text>
                <Text style={s.separatorCount}>
                  {group.products.length}{' '}
                  {group.products.length === 1 ? 'prodotto' : 'prodotti'}
                </Text>
              </View>
              <CatalogFooter config={config} />
            </Page>
          )}
          <Page size="A4" style={s.page}>
            <CatalogHeader config={config} today={today} />
            <ProductGrid products={group.products} config={config} />
            <CatalogFooter config={config} />
          </Page>
        </React.Fragment>
      ))}
    </Document>
  );
}
