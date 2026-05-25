import { NextRequest, NextResponse } from 'next/server';
import { requireMondiEspositivi } from '@/lib/featureGuard';
import { prisma } from '@/lib/prisma';
import React from 'react';
import { renderToBuffer, Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';

const FORBIDDEN = NextResponse.json({ error: 'Forbidden' }, { status: 403 });

const COL = 5;

const styles = StyleSheet.create({
  page: { padding: 36, fontFamily: 'Helvetica', backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 12, borderBottom: '1 solid #E5E7EB' },
  headerTitle: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#111827', letterSpacing: 1 },
  headerSub: { fontSize: 9, color: '#6B7280', marginTop: 2 },
  groupHeader: { backgroundColor: '#111827', padding: '10 14', marginBottom: 14, flexDirection: 'row', alignItems: 'center' },
  groupDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  groupName: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#FFFFFF', letterSpacing: 0.5 },
  groupMeta: { fontSize: 8, color: '#9CA3AF', marginTop: 2 },
  lineaLabel: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#6B7280', letterSpacing: 1, marginBottom: 6, marginTop: 10, textTransform: 'uppercase' },
  lineaSep: { borderBottom: '0.5 solid #E5E7EB', marginBottom: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  cell: { width: '18.4%' },
  cellImg: { width: '100%', aspectRatio: 1, objectFit: 'cover', backgroundColor: '#F3F4F6', borderRadius: 3 },
  cellCode: { fontSize: 6, color: '#9CA3AF', marginTop: 2, textAlign: 'center' },
  cellQty: { fontSize: 6, fontFamily: 'Helvetica-Bold', color: '#374151', textAlign: 'center' },
  footer: { position: 'absolute', bottom: 24, left: 36, right: 36, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerText: { fontSize: 7, color: '#9CA3AF' },
  noGroups: { fontSize: 12, color: '#6B7280', textAlign: 'center', marginTop: 60 },
});

async function fetchImg(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const mime = res.headers.get('content-type') ?? 'image/jpeg';
    return `data:${mime};base64,${buf.toString('base64')}`;
  } catch { return null; }
}

function sortItems<T extends { orderItem: { product?: { nomLinea?: string | null; colore?: string | null } | null } }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const la = a.orderItem.product?.nomLinea ?? '';
    const lb = b.orderItem.product?.nomLinea ?? '';
    if (la !== lb) return la.localeCompare(lb);
    const ca = a.orderItem.product?.colore ?? '';
    const cb = b.orderItem.product?.colore ?? '';
    return ca.localeCompare(cb);
  });
}

export async function GET(_req: NextRequest, { params }: { params: { orderId: string } }) {
  const operatorId = await requireMondiEspositivi();
  if (!operatorId) return FORBIDDEN;

  const [order, groups] = await Promise.all([
    prisma.order.findUnique({
      where: { id: params.orderId },
      select: { orderNumber: true, id: true },
    }),
    prisma.displayGroup.findMany({
      where: { orderId: params.orderId },
      orderBy: { posizione: 'asc' },
      include: {
        prodotti: {
          orderBy: { posizione: 'asc' },
          include: {
            orderItem: {
              include: {
                product: {
                  select: {
                    code: true, name: true, imageUrl: true,
                    nomLinea: true, colore: true, retailPrice: true,
                  },
                },
              },
            },
          },
        },
      },
    }),
  ]);

  if (!order) return NextResponse.json({ error: 'Ordine non trovato' }, { status: 404 });

  const orderLabel = order.orderNumber ?? `#${order.id.slice(0, 8).toUpperCase()}`;
  const dateLabel = new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' });

  // Prefetch images
  const imgCache = new Map<string, string | null>();
  await Promise.all(
    groups.flatMap((g) => g.prodotti.map(async (p) => {
      const url = p.orderItem.product?.imageUrl;
      if (url && !imgCache.has(url)) imgCache.set(url, await fetchImg(url));
    }))
  );

  // Build group-by-linea structure
  function buildLineaGroups(items: typeof groups[0]['prodotti']) {
    const sorted = sortItems(items);
    const map = new Map<string, typeof items>();
    for (const item of sorted) {
      const linea = item.orderItem.product?.nomLinea ?? '';
      if (!map.has(linea)) map.set(linea, []);
      map.get(linea)!.push(item);
    }
    return Array.from(map.entries());
  }

  const doc = React.createElement(
    Document,
    { title: `Mondi Espositivi - ${orderLabel}` },
    ...groups.map((group, gIdx) => {
      const lineaGroups = buildLineaGroups(group.prodotti);

      const productElements: React.ReactElement[] = [];
      for (const [linea, lineaItems] of lineaGroups) {
        // Linea separator
        if (linea) {
          productElements.push(
            React.createElement(View, { key: `sep-${linea}` },
              React.createElement(Text, { style: styles.lineaLabel }, linea),
              React.createElement(View, { style: styles.lineaSep }),
            )
          );
        }
        // 5-col grid rows
        for (let i = 0; i < lineaItems.length; i += COL) {
          const row = lineaItems.slice(i, i + COL);
          productElements.push(
            React.createElement(
              View,
              { key: `row-${linea}-${i}`, style: { flexDirection: 'row', gap: 6, marginBottom: 6 } },
              ...row.map((item) => {
                const p = item.orderItem.product;
                const img = p?.imageUrl ? imgCache.get(p.imageUrl) : null;
                return React.createElement(
                  View,
                  { key: item.id, style: styles.cell },
                  img
                    ? React.createElement(Image, { src: img, style: styles.cellImg })
                    : React.createElement(View, { style: styles.cellImg }),
                  React.createElement(Text, { style: styles.cellCode }, p?.code ?? ''),
                  React.createElement(Text, { style: styles.cellQty }, `× ${item.orderItem.quantity}`),
                );
              }),
            )
          );
        }
      }

      return React.createElement(
        Page,
        { key: group.id, size: 'A4', style: styles.page },
        // Header
        React.createElement(
          View,
          { style: styles.header },
          React.createElement(
            View,
            null,
            React.createElement(Text, { style: styles.headerTitle }, 'ON EARTH B2B'),
            React.createElement(Text, { style: styles.headerSub }, `Mondi Espositivi · Ordine ${orderLabel}`),
          ),
          React.createElement(
            View,
            { style: { alignItems: 'flex-end' } },
            React.createElement(Text, { style: { fontSize: 8, color: '#6B7280' } }, `Mondo ${gIdx + 1} di ${groups.length}`),
          ),
        ),
        // Group header
        React.createElement(
          View,
          { style: styles.groupHeader },
          group.coloreTag && React.createElement(View, { style: [styles.groupDot, { backgroundColor: group.coloreTag }] }),
          React.createElement(
            View,
            null,
            React.createElement(Text, { style: styles.groupName }, group.nome),
            (group.stagione || group.temaTag) && React.createElement(
              Text, { style: styles.groupMeta },
              [group.stagione, group.temaTag].filter(Boolean).join(' · ')
            ),
          ),
        ),
        // Product grid sorted by linea
        ...productElements,
        // Footer
        React.createElement(
          View,
          { style: styles.footer, fixed: true },
          React.createElement(Text, { style: styles.footerText }, `ON EARTH B2B · ${dateLabel}`),
          React.createElement(Text, { style: styles.footerText, render: ({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) => `${pageNumber} / ${totalPages}` }),
        ),
      );
    }),
    groups.length === 0
      ? React.createElement(
          Page,
          { size: 'A4', style: styles.page },
          React.createElement(Text, { style: styles.noGroups }, 'Nessun mondo espositivo da esportare.')
        )
      : null,
  );

  const buffer = await renderToBuffer(doc as any);

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="mondi-espositivi-${params.orderId.slice(0, 8)}.pdf"`,
    },
  });
}
