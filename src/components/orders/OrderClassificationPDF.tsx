import React from 'react';
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';
import type { Order } from '@/types';

// ── Types ─────────────────────────────────────────────────────
export interface EnrichedItem {
  id: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  imageData: string | null;
  product: {
    id: string;
    code: string;
    name: string;
    imageUrl: string | null;
    misura: string | null;
    produttore: string | null;
    [key: string]: any;
  };
}

export interface OrderClassificationPDFProps {
  order: Order;
  items: EnrichedItem[];
  groupBy: string;
  groupByLabel: string;
  customerName: string;
}

// ── Layout constants ──────────────────────────────────────────
const H_PAD = 44;
const PAGE_W = 595;
const USABLE_W = PAGE_W - H_PAD * 2; // 507
const GAP = 8;
const COLS = 3;
const CARD_W = Math.floor((USABLE_W - GAP * (COLS - 1)) / COLS); // 163
const IMG_H = 108;
const BODY_H = 70;

// ── Palette ───────────────────────────────────────────────────
const C = {
  primary: '#1C1C1C',
  accent: '#8B7355',
  cream: '#F5F2EE',
  border: '#E5E0D8',
  muted: '#9CA3AF',
  white: '#FFFFFF',
  placeholder: '#C8C0B5',
};

// ── Styles ────────────────────────────────────────────────────
const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 8,
    color: C.primary,
    paddingTop: 40,
    paddingBottom: 56,
    paddingLeft: H_PAD,
    paddingRight: H_PAD,
    backgroundColor: C.white,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    borderBottomStyle: 'solid',
  },
  brandName: { fontSize: 18, fontFamily: 'Helvetica-Bold', letterSpacing: 4, color: C.primary },
  brandSub: { fontSize: 6.5, letterSpacing: 2.5, color: C.accent, marginTop: 4 },
  metaBlock: { alignItems: 'flex-end' },
  orderNum: { fontSize: 10, fontFamily: 'Helvetica-Bold', letterSpacing: 1.5 },
  orderDetail: { fontSize: 7, color: C.muted, marginTop: 2 },
  groupBar: {
    backgroundColor: C.primary,
    paddingTop: 7,
    paddingBottom: 7,
    paddingLeft: 10,
    paddingRight: 10,
    marginTop: 12,
    marginBottom: 8,
  },
  groupTitle: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 2,
    color: C.white,
    textTransform: 'uppercase',
  },
  groupMeta: { fontSize: 6.5, color: C.accent, marginTop: 2, letterSpacing: 1 },
  gridRow: { flexDirection: 'row', marginBottom: GAP },
  card: {
    width: CARD_W,
    borderWidth: 0.5,
    borderColor: C.border,
    borderStyle: 'solid',
    backgroundColor: C.white,
  },
  imgArea: { width: CARD_W, height: IMG_H, backgroundColor: C.placeholder },
  img: { width: CARD_W, height: IMG_H, objectFit: 'cover' },
  placeholderBox: { width: CARD_W, height: IMG_H, justifyContent: 'center', alignItems: 'center', backgroundColor: C.placeholder },
  placeholderCode: { fontSize: 6.5, color: C.white, fontFamily: 'Helvetica-Bold', letterSpacing: 0.8, textAlign: 'center' },
  cardBody: { padding: 7, height: BODY_H, justifyContent: 'space-between' },
  cardCode: { fontSize: 6, color: C.muted, fontFamily: 'Helvetica-Bold', letterSpacing: 1 },
  cardName: { fontSize: 7.5, color: C.primary, lineHeight: 1.35, marginTop: 2 },
  cardPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 5,
    borderTopWidth: 0.5,
    borderTopColor: C.border,
    borderTopStyle: 'solid',
  },
  cardUnitPrice: { fontSize: 6.5, color: C.muted },
  cardSubtotal: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: C.primary },
  subtotalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingTop: 4,
    paddingBottom: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
    borderBottomStyle: 'solid',
    marginBottom: 4,
  },
  subtotalLabel: { fontSize: 7, color: C.muted, letterSpacing: 1, marginRight: 10, textTransform: 'uppercase' },
  subtotalValue: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', width: 72, textAlign: 'right' },
  notesBox: {
    marginTop: 10,
    padding: 8,
    backgroundColor: C.cream,
    borderWidth: 0.5,
    borderColor: C.border,
    borderStyle: 'solid',
  },
  notesLabel: { fontSize: 6, fontFamily: 'Helvetica-Bold', color: C.muted, letterSpacing: 1.5, marginBottom: 3 },
  notesText: { fontSize: 7.5, color: C.primary, lineHeight: 1.4 },
  totalBox: {
    marginTop: 16,
    paddingTop: 10,
    borderTopWidth: 1.5,
    borderTopColor: C.primary,
    borderTopStyle: 'solid',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'baseline',
  },
  totalLabel: { fontSize: 8, fontFamily: 'Helvetica-Bold', letterSpacing: 2, textTransform: 'uppercase', marginRight: 12, color: C.primary },
  totalValue: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: C.primary, width: 88, textAlign: 'right' },
  footer: {
    position: 'absolute',
    bottom: 18,
    left: H_PAD,
    right: H_PAD,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 0.5,
    borderTopColor: C.border,
    borderTopStyle: 'solid',
    paddingTop: 5,
  },
  footerText: { fontSize: 6.5, color: C.muted, letterSpacing: 0.5 },
});

// ── Helpers ───────────────────────────────────────────────────
function euro(n: number) {
  return '€ ' + n.toFixed(2).replace('.', ',');
}

function isoToItalian(iso: string) {
  return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' });
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// ── Product card ──────────────────────────────────────────────
function ProductCard({ item, pos }: { item: EnrichedItem; pos: number }) {
  return (
    <View style={[s.card, { marginRight: pos < COLS - 1 ? GAP : 0 }]}>
      {item.imageData ? (
        <Image src={item.imageData} style={s.img} />
      ) : (
        <View style={s.placeholderBox}>
          <Text style={s.placeholderCode}>{item.product.code}</Text>
        </View>
      )}
      <View style={s.cardBody}>
        <View>
          <Text style={s.cardCode}>{item.product.code}</Text>
          <Text style={s.cardName}>{item.product.name}</Text>
        </View>
        <View style={s.cardPriceRow}>
          <Text style={s.cardUnitPrice}>{euro(item.unitPrice)}</Text>
          <Text style={s.cardSubtotal}>×{item.quantity} {euro(item.subtotal)}</Text>
        </View>
      </View>
    </View>
  );
}

// ── Empty filler (keeps grid aligned on partial rows) ─────────
function FillerCard({ pos }: { pos: number }) {
  return <View style={{ width: CARD_W, marginRight: pos < COLS - 1 ? GAP : 0 }} />;
}

// ── Document ──────────────────────────────────────────────────
export function OrderClassificationPDF({
  order,
  items,
  groupBy,
  groupByLabel,
  customerName,
}: OrderClassificationPDFProps) {
  // Build groups
  const groupMap = new Map<string, EnrichedItem[]>();
  for (const item of items) {
    const val = (item.product as any)[groupBy] || 'Non classificato';
    if (!groupMap.has(val)) groupMap.set(val, []);
    groupMap.get(val)!.push(item);
  }
  const groups = Array.from(groupMap.entries())
    .sort(([a], [b]) => a.localeCompare(b, 'it'))
    .map(([key, grpItems]) => ({
      key,
      items: grpItems,
      subtotal: grpItems.reduce((acc, it) => acc + Number(it.subtotal), 0),
    }));

  const grandTotal = Number(order.totalValue);

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.brandName}>ON EARTH</Text>
            <Text style={s.brandSub}>
              {'CASA 2027  ·  PER ' + groupByLabel.toUpperCase()}
            </Text>
          </View>
          <View style={s.metaBlock}>
            <Text style={s.orderNum}>#{order.id.slice(0, 8).toUpperCase()}</Text>
            <Text style={s.orderDetail}>{isoToItalian(order.createdAt)}</Text>
            {customerName ? <Text style={s.orderDetail}>{customerName}</Text> : null}
            <Text style={s.orderDetail}>
              {items.length} art. · {order.totalItems} pz.
            </Text>
          </View>
        </View>

        {/* Groups */}
        {groups.map((group, gi) => (
          <View key={gi}>
            {/* Group title bar */}
            <View style={s.groupBar}>
              <Text style={s.groupTitle}>{group.key}</Text>
              <Text style={s.groupMeta}>
                {group.items.length} articol{group.items.length === 1 ? 'o' : 'i'}
                {'  ·  ' + euro(group.subtotal)}
              </Text>
            </View>

            {/* Product grid */}
            {chunkArray(group.items, COLS).map((row, ri) => (
              <View key={ri} style={s.gridRow} wrap={false}>
                {Array.from({ length: COLS }).map((_, ci) => {
                  const item = row[ci];
                  return item
                    ? <ProductCard key={ci} item={item} pos={ci} />
                    : <FillerCard key={ci} pos={ci} />;
                })}
              </View>
            ))}

            {/* Group subtotal */}
            <View style={s.subtotalRow}>
              <Text style={s.subtotalLabel}>Subtotale {group.key}</Text>
              <Text style={s.subtotalValue}>{euro(group.subtotal)}</Text>
            </View>
          </View>
        ))}

        {/* Notes */}
        {order.notes ? (
          <View style={s.notesBox}>
            <Text style={s.notesLabel}>NOTE</Text>
            <Text style={s.notesText}>{order.notes}</Text>
          </View>
        ) : null}

        {/* Grand total */}
        <View style={s.totalBox} wrap={false}>
          <Text style={s.totalLabel}>Totale Ordine</Text>
          <Text style={s.totalValue}>{euro(grandTotal)}</Text>
        </View>

        {/* Footer — repeats on every page */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>ON EARTH B2B  ·  CASA 2027</Text>
          <Text
            style={s.footerText}
            render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}
