import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import { OrderClassificationPDF } from '@/components/orders/OrderClassificationPDF';
import type { EnrichedItem } from '@/components/orders/OrderClassificationPDF';

const GROUP_LABELS: Record<string, string> = {
  gruppoMerceologico: 'Gruppo merceologico',
  famiglia: 'Famiglia',
  classe: 'Classe',
  sottoclasse: 'Sottoclasse',
  gruppoOmogeneo: 'Gruppo omogeneo',
  nomLinea: 'Linea',
  stagione: 'Stagione',
  collezione: 'Collezione',
  colore: 'Colore',
  temaColore: 'Tema colore',
};

// react-pdf supports JPEG, PNG and GIF only (not WebP/AVIF)
const SUPPORTED_MIME = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/gif']);

async function fetchImageAsBase64(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;

    // Strip charset/boundary parameters: "image/jpeg; charset=utf-8" → "image/jpeg"
    const rawCt = res.headers.get('content-type') ?? '';
    const mimeType = rawCt.split(';')[0].trim().toLowerCase();

    // If the server returns an unsupported format, skip rather than corrupt the PDF
    if (!SUPPORTED_MIME.has(mimeType) && mimeType !== '') return null;

    const ct = SUPPORTED_MIME.has(mimeType) ? mimeType : 'image/jpeg';
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length === 0) return null;

    return `data:${ct};base64,${buf.toString('base64')}`;
  } catch {
    return null;
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const groupBy = req.nextUrl.searchParams.get('groupBy') ?? '';
    if (!GROUP_LABELS[groupBy]) {
      return NextResponse.json({ error: 'Parametro groupBy non valido' }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: {
        customer: { select: { id: true, companyName: true } },
        items: {
          include: { product: true },
        },
      },
    });

    if (!order) return NextResponse.json({ error: 'Non trovato' }, { status: 404 });

    if (session.user.role === 'CUSTOMER' && order.customerId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Keep only items that still have a linked product
    const validItems = order.items.filter((it) => it.product != null);

    // Pre-fetch all product images as base64 data URIs in parallel
    const imageData = await Promise.all(
      validItems.map((it) =>
        it.product!.imageUrl ? fetchImageAsBase64(it.product!.imageUrl) : Promise.resolve(null)
      )
    );

    const enrichedItems: EnrichedItem[] = validItems.map((it, i) => ({
      id: it.id,
      quantity: it.quantity,
      unitPrice: Number(it.unitPrice),
      subtotal: Number(it.subtotal),
      imageData: imageData[i] ?? null,
      product: {
        ...(it.product as any),
        id: it.product!.id,
        code: it.product!.code,
        name: it.product!.name,
        imageUrl: it.product!.imageUrl,
        misura: it.product!.misura,
        produttore: it.product!.produttore,
      },
    }));

    const serializedOrder = {
      ...order,
      totalValue: Number(order.totalValue),
      totalItems: order.items.reduce((s, it) => s + it.quantity, 0),
      createdAt: order.createdAt.toISOString(),
      confirmedAt: order.confirmedAt?.toISOString() ?? null,
      updatedAt: order.updatedAt.toISOString(),
    };

    const customerName = order.customer?.companyName ?? '';
    const groupByLabel = GROUP_LABELS[groupBy];

    const pdfBuffer = await renderToBuffer(
      React.createElement(OrderClassificationPDF, {
        order: serializedOrder as any,
        items: enrichedItems,
        groupBy,
        groupByLabel,
        customerName,
      }) as any
    );

    const safeLabel = groupBy.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const filename = `ordine-${params.id.slice(0, 8)}-per-${safeLabel}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error('[pdf-classification]', err);
    return NextResponse.json({ error: 'Errore generazione PDF' }, { status: 500 });
  }
}
