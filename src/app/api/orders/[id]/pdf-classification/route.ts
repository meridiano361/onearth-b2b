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

async function fetchImageAsBase64(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    const ct = res.headers.get('content-type') || 'image/jpeg';
    return `data:${ct};base64,${Buffer.from(buf).toString('base64')}`;
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

    // Pre-fetch all product images in parallel
    const imageUrls = order.items.map((it) => it.product?.imageUrl ?? null);
    const imageData = await Promise.all(
      imageUrls.map((url) => (url ? fetchImageAsBase64(url) : Promise.resolve(null)))
    );

    const enrichedItems: EnrichedItem[] = order.items.map((it, i) => ({
      id: it.id,
      quantity: it.quantity,
      unitPrice: Number(it.unitPrice),
      subtotal: Number(it.subtotal),
      imageData: imageData[i],
      product: {
        id: it.product.id,
        code: it.product.code,
        name: it.product.name,
        imageUrl: it.product.imageUrl,
        misura: it.product.misura,
        produttore: it.product.produttore,
        ...(it.product as any),
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
