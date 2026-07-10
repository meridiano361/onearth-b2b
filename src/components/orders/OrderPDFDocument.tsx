import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { Order, OrderItem } from '@/types';

export type PDFGrouping = 'all' | 'famiglia' | 'sottofamiglia' | 'nomLinea' | 'colore';

const C = {
  primary: '#1a1a1a',
  accent: '#8B7355',
  cream: '#F5F2EE',
  border: '#E5E0D8',
  muted: '#9CA3AF',
};

const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 8,
    color: C.primary,
    paddingTop: 40,
    paddingBottom: 60,
    paddingLeft: 44,
    paddingRight: 44,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingBottom: 14,
    borderBottomColor: C.border,
    borderBottomWidth: 1,
  },
  brandName: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 5,
    color: C.primary,
  },
  brandSeason: {
    fontSize: 7,
    letterSpacing: 3,
    color: C.accent,
    marginTop: 3,
  },
  orderMeta: {
    alignItems: 'flex-end',
  },
  orderNumber: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 1.5,
    color: C.primary,
  },
  orderDetail: {
    fontSize: 7.5,
    color: C.muted,
    marginTop: 2,
  },
  sectionBg: {
    backgroundColor: C.cream,
    paddingTop: 5,
    paddingBottom: 5,
    paddingLeft: 8,
    paddingRight: 8,
    marginTop: 14,
    marginBottom: 2,
    borderRadius: 2,
  },
  sectionTitle: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 2,
    color: C.accent,
    textTransform: 'uppercase',
  },
  tableHead: {
    flexDirection: 'row',
    borderBottomColor: C.border,
    borderBottomWidth: 1,
    paddingBottom: 4,
    paddingTop: 4,
  },
  thText: {
    fontSize: 6.5,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 1.5,
    color: C.muted,
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomColor: C.border,
    borderBottomWidth: 0.5,
    paddingTop: 5,
    paddingBottom: 5,
    alignItems: 'flex-start',
  },
  cCode: { width: 62, paddingRight: 6 },
  cName: { flex: 1, paddingRight: 6 },
  cQty: { width: 28, paddingRight: 6, alignItems: 'flex-end' },
  cPrice: { width: 52, paddingRight: 6, alignItems: 'flex-end' },
  cTotal: { width: 56, alignItems: 'flex-end' },
  codeCell: { fontSize: 7.5, color: C.muted },
  nameCell: { fontSize: 8, color: C.primary },
  subCell: { fontSize: 6.5, color: C.muted, marginTop: 1.5 },
  numCell: { fontSize: 8, color: C.primary },
  boldCell: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.primary },
  subtotalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: 4,
    paddingBottom: 8,
    borderBottomColor: C.border,
    borderBottomWidth: 1,
  },
  subtotalLabel: {
    fontSize: 7,
    color: C.muted,
    letterSpacing: 1,
    marginRight: 8,
    textTransform: 'uppercase',
  },
  subtotalValue: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: 10,
    marginTop: 6,
    borderTopColor: C.primary,
    borderTopWidth: 1.5,
  },
  totalLabel: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginRight: 8,
  },
  totalValue: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 44,
    right: 44,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopColor: C.border,
    borderTopWidth: 0.5,
    paddingTop: 5,
  },
  footerText: {
    fontSize: 6.5,
    color: C.muted,
    letterSpacing: 1,
  },
});

function euro(n: number) {
  return '€ ' + n.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function isoToItalian(iso: string) {
  return new Date(iso).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

interface Group {
  key: string;
  items: OrderItem[];
}

function buildGroups(items: OrderItem[], grouping: PDFGrouping): Group[] {
  if (grouping === 'all') return [{ key: '', items }];
  const map = new Map<string, OrderItem[]>();
  for (const item of items) {
    const val = (item.product as any)?.[grouping] || 'Non specificato';
    if (!map.has(val)) map.set(val, []);
    map.get(val)!.push(item);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b, 'it'))
    .map(([key, items]) => ({ key, items }));
}

function TableHeader() {
  return (
    <View style={s.tableHead}>
      <View style={s.cCode}><Text style={s.thText}>Codice</Text></View>
      <View style={s.cName}><Text style={s.thText}>Prodotto</Text></View>
      <View style={s.cQty}><Text style={s.thText}>Qtà</Text></View>
      <View style={s.cPrice}><Text style={s.thText}>Prezzo</Text></View>
      <View style={s.cTotal}><Text style={s.thText}>Totale</Text></View>
    </View>
  );
}

function ItemRow({ item }: { item: OrderItem }) {
  const p = item.product;
  const details: string[] = [];
  if (p?.nomLinea) details.push(`Linea: ${p.nomLinea}`);
  if (p?.colore) details.push(`Col: ${p.colore}`);
  if (p?.misura) details.push(`Mis: ${p.misura}`);

  return (
    <View style={s.tableRow} wrap={false}>
      <View style={s.cCode}>
        <Text style={s.codeCell}>{p?.code ?? '—'}</Text>
      </View>
      <View style={s.cName}>
        <Text style={s.nameCell}>{p?.name ?? '—'}</Text>
        {details.length > 0 && (
          <Text style={s.subCell}>{details.join(' · ')}</Text>
        )}
      </View>
      <View style={s.cQty}>
        <Text style={s.numCell}>{item.quantity}</Text>
      </View>
      <View style={s.cPrice}>
        <Text style={s.numCell}>{euro(item.unitPrice)}</Text>
      </View>
      <View style={s.cTotal}>
        <Text style={s.boldCell}>{euro(item.subtotal)}</Text>
      </View>
    </View>
  );
}

export interface OrderPDFDocumentProps {
  order: Order;
  grouping: PDFGrouping;
  customerName?: string;
}

export function OrderPDFDocument({ order, grouping, customerName }: OrderPDFDocumentProps) {
  const items = order.items ?? [];
  const groups = buildGroups(items, grouping);

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.brandName}>ON EARTH</Text>
            <Text style={s.brandSeason}>CASA 2027</Text>
          </View>
          <View style={s.orderMeta}>
            <Text style={s.orderNumber}>#{order.id.slice(0, 8).toUpperCase()}</Text>
            <Text style={s.orderDetail}>{isoToItalian(order.createdAt)}</Text>
            {customerName && <Text style={s.orderDetail}>{customerName}</Text>}
            <Text style={s.orderDetail}>{items.length} righe · {order.totalItems} pz</Text>
          </View>
        </View>

        {/* Product groups */}
        {groups.map((group, gi) => (
          <View key={gi}>
            {group.key !== '' && (
              <View style={s.sectionBg}>
                <Text style={s.sectionTitle}>{group.key}</Text>
              </View>
            )}
            <TableHeader />
            {group.items.map((item) => (
              <ItemRow key={item.id} item={item} />
            ))}
            {group.key !== '' && (
              <View style={s.subtotalRow}>
                <Text style={s.subtotalLabel}>Subtotale {group.key}</Text>
                <View style={{ width: 56, alignItems: 'flex-end' }}>
                  <Text style={s.subtotalValue}>
                    {euro(group.items.reduce((acc, it) => acc + it.subtotal, 0))}
                  </Text>
                </View>
              </View>
            )}
          </View>
        ))}

        {/* Grand total */}
        <View style={s.totalRow} wrap={false}>
          <Text style={s.totalLabel}>Totale Ordine</Text>
          <View style={{ width: 56, alignItems: 'flex-end' }}>
            <Text style={s.totalValue}>{euro(order.totalValue)}</Text>
          </View>
        </View>

        {/* Fixed footer on every page */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>ON EARTH B2B · CASA 2027</Text>
          <Text
            style={s.footerText}
            render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}
