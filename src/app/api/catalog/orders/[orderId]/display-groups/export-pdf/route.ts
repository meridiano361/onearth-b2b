import { NextRequest, NextResponse } from 'next/server';
import { requireMondiEspositivi } from '@/lib/featureGuard';
import { prisma } from '@/lib/prisma';
import React from 'react';
import { renderToBuffer, Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';

const FORBIDDEN = NextResponse.json({ error: 'Forbidden' }, { status: 403 });

const COLS = 5;
const ROWS = 5;
const PER_PAGE = COLS * ROWS; // 25

// A4 usable width = 595 - 72 = 523pt; 5 cols with gap 3: (523 - 4×3) / 5 ≈ 101pt
const CELL_W = '19.2%';

const s = StyleSheet.create({
  page: { paddingHorizontal: 36, paddingTop: 36, paddingBottom: 30, fontFamily: 'Helvetica', backgroundColor: '#FFFFFF' },

  // Header — height ~30pt
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, height: 30 },
  headerLogo: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#111827', width: 80 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerGroupName: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#111827' },
  headerGroupMeta: { fontSize: 7, color: '#6B7280', marginTop: 2 },
  headerRight: { width: 80, alignItems: 'flex-end' },
  headerPageNum: { fontSize: 9, color: '#6B7280' },
  colorRect: { width: 10, height: 10, borderRadius: 2, marginLeft: 4 },

  // Header line
  headerLine: { borderBottom: '0.5 solid #E5E7EB', marginBottom: 10 },

  // Grid row
  gridRow: { flexDirection: 'row', gap: 3, marginBottom: 3 },

  // Cell
  cell: { width: CELL_W, border: '0.5 solid #E5E7EB', padding: 3 },
  cellImg: { width: '100%', aspectRatio: 1, backgroundColor: '#F3F4F6', objectFit: 'cover' },
  cellImgPlaceholder: { width: '100%', aspectRatio: 1, backgroundColor: '#F3F4F6' },
  cellCode: { fontSize: 6.5, color: '#6B7280', textAlign: 'center', marginTop: 3 },
  cellName: { fontSize: 7, color: '#111827', textAlign: 'center', marginTop: 2 },

  // Footer — height ~16pt
  footer: { position: 'absolute', bottom: 16, left: 36, right: 36, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerText: { fontSize: 8, color: '#9CA3AF' },

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

function truncateName(name: string, maxLen = 40): string {
  return name.length > maxLen ? name.slice(0, maxLen - 1) + '…' : name;
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
                    nomLinea: true, colore: true,
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

  // Prefetch all images
  const imgCache = new Map<string, string | null>();
  await Promise.all(
    groups.flatMap((g) => g.prodotti.map(async (p) => {
      const url = p.orderItem.product?.imageUrl;
      if (url && !imgCache.has(url)) imgCache.set(url, await fetchImg(url));
    }))
  );

  // Build all pages
  const pageElements: React.ReactElement[] = [];

  for (const group of groups) {
    const sorted = sortItems(group.prodotti);
    const totalGroupPages = Math.max(1, Math.ceil(sorted.length / PER_PAGE));

    for (let pageIdx = 0; pageIdx < totalGroupPages; pageIdx++) {
      const pageProducts = sorted.slice(pageIdx * PER_PAGE, (pageIdx + 1) * PER_PAGE);
      const isFirst = pageIdx === 0;
      const groupPageLabel = totalGroupPages > 1 ? `Pag. ${pageIdx + 1}/${totalGroupPages}` : '';

      // Build grid rows
      const gridRows: React.ReactElement[] = [];
      for (let r = 0; r < ROWS; r++) {
        const cells: React.ReactElement[] = [];
        for (let c = 0; c < COLS; c++) {
          const item = pageProducts[r * COLS + c];
          if (!item) {
            // empty cell (filler)
            cells.push(
              React.createElement(View, { key: `empty-${r}-${c}`, style: s.cell })
            );
          } else {
            const p = item.orderItem.product;
            const img = p?.imageUrl ? imgCache.get(p.imageUrl) : null;
            cells.push(
              React.createElement(
                View,
                { key: item.id, style: s.cell },
                img
                  ? React.createElement(Image, { src: img, style: s.cellImg })
                  : React.createElement(View, { style: s.cellImgPlaceholder }),
                React.createElement(Text, { style: s.cellCode }, p?.code ?? ''),
                p?.name ? React.createElement(Text, { style: s.cellName }, truncateName(p.name)) : null,
              )
            );
          }
        }
        gridRows.push(
          React.createElement(View, { key: `row-${r}`, style: s.gridRow }, ...cells)
        );
      }

      pageElements.push(
        React.createElement(
          Page,
          { key: `${group.id}-${pageIdx}`, size: 'A4', style: s.page },

          // Header
          React.createElement(
            View,
            { style: s.header },
            // Logo left
            React.createElement(Text, { style: s.headerLogo }, 'ON EARTH'),
            // Group name center
            React.createElement(
              View,
              { style: s.headerCenter },
              React.createElement(
                View,
                { style: { flexDirection: 'row', alignItems: 'center' } },
                React.createElement(Text, { style: s.headerGroupName }, isFirst ? group.nome : `${group.nome} (cont.)`),
                group.coloreTag
                  ? React.createElement(View, { style: [s.colorRect, { backgroundColor: group.coloreTag }] })
                  : null,
              ),
              (group.stagione || group.temaTag || groupPageLabel)
                ? React.createElement(
                    Text,
                    { style: s.headerGroupMeta },
                    [group.stagione, group.temaTag, groupPageLabel].filter(Boolean).join(' · ')
                  )
                : null,
            ),
            // Page number right
            React.createElement(
              View,
              { style: s.headerRight },
              React.createElement(Text, { style: s.headerPageNum, render: ({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) => `${pageNumber} / ${totalPages}` }),
            ),
          ),

          // Header separator
          React.createElement(View, { style: s.headerLine }),

          // Product grid
          ...gridRows,

          // Footer
          React.createElement(
            View,
            { style: s.footer, fixed: true },
            React.createElement(Text, { style: s.footerText }, `Ordine ${orderLabel}`),
            React.createElement(Text, { style: s.footerText }, dateLabel),
          ),
        )
      );
    }
  }

  // Empty state page
  if (groups.length === 0) {
    pageElements.push(
      React.createElement(
        Page,
        { key: 'empty', size: 'A4', style: s.page },
        React.createElement(Text, { style: s.noGroups }, 'Nessun mondo espositivo da esportare.')
      )
    );
  }

  const doc = React.createElement(Document, { title: `Mondi Espositivi - ${orderLabel}` }, ...pageElements);
  const buffer = await renderToBuffer(doc as any);

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="mondi-espositivi-${params.orderId.slice(0, 8)}.pdf"`,
    },
  });
}
