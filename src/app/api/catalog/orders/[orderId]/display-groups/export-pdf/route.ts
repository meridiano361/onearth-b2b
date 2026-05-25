import { NextRequest, NextResponse } from 'next/server';
import { requireMondiEspositivi } from '@/lib/featureGuard';
import { prisma } from '@/lib/prisma';
import React from 'react';
import { renderToBuffer, Document, Page, View, Text, Image, StyleSheet, Font } from '@react-pdf/renderer';

const FORBIDDEN = NextResponse.json({ error: 'Forbidden' }, { status: 403 });

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, paddingBottom: 16, borderBottom: '1 solid #E5E7EB' },
  headerTitle: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#111827', letterSpacing: 1 },
  headerSub: { fontSize: 9, color: '#6B7280', marginTop: 2 },
  groupHeader: { backgroundColor: '#111827', padding: '10 16', marginBottom: 16, flexDirection: 'row', alignItems: 'center' },
  groupDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  groupName: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#FFFFFF', letterSpacing: 0.5 },
  groupMeta: { fontSize: 8, color: '#9CA3AF', marginTop: 2 },
  productRow: { flexDirection: 'row', marginBottom: 10, padding: '8 10', backgroundColor: '#F9FAFB', borderRadius: 4 },
  productImg: { width: 56, height: 56, objectFit: 'cover', borderRadius: 3, backgroundColor: '#E5E7EB' },
  productInfo: { flex: 1, marginLeft: 10, justifyContent: 'center' },
  productCode: { fontSize: 8, color: '#6B7280', fontFamily: 'Helvetica-Bold', letterSpacing: 0.5 },
  productName: { fontSize: 9, color: '#111827', marginTop: 2 },
  productDesc: { fontSize: 8, color: '#6B7280', marginTop: 2 },
  productQty: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#111827', alignSelf: 'center', marginLeft: 8, minWidth: 30, textAlign: 'right' },
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
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
                    code: true, name: true, description: true,
                    imageUrl: true, retailPrice: true,
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

  const doc = React.createElement(
    Document,
    { title: `Mondi Espositivi - ${orderLabel}` },
    ...groups.map((group, gIdx) =>
      React.createElement(
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
        // Products
        ...group.prodotti.map((item) => {
          const p = item.orderItem.product;
          if (!p) return null;
          const img = p.imageUrl ? imgCache.get(p.imageUrl) : null;
          return React.createElement(
            View,
            { key: item.id, style: styles.productRow },
            img
              ? React.createElement(Image, { src: img, style: styles.productImg })
              : React.createElement(View, { style: styles.productImg }),
            React.createElement(
              View,
              { style: styles.productInfo },
              React.createElement(Text, { style: styles.productCode }, p.code),
              React.createElement(Text, { style: styles.productName }, p.name),
              p.description && React.createElement(Text, { style: styles.productDesc }, p.description.slice(0, 80)),
            ),
            React.createElement(
              View,
              { style: { alignSelf: 'center', marginLeft: 8 } },
              React.createElement(Text, { style: styles.productQty }, `× ${item.orderItem.quantity}`),
              React.createElement(Text, { style: { fontSize: 8, color: '#6B7280', textAlign: 'right' } },
                `€ ${Number(item.orderItem.unitPrice).toFixed(2)}`),
            ),
          );
        }).filter(Boolean),
        // Footer
        React.createElement(
          View,
          { style: styles.footer, fixed: true },
          React.createElement(Text, { style: styles.footerText }, `ON EARTH B2B · ${dateLabel}`),
          React.createElement(Text, { style: styles.footerText, render: ({ pageNumber, totalPages }: any) => `${pageNumber} / ${totalPages}` }),
        ),
      )
    ),
    // Empty state
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
