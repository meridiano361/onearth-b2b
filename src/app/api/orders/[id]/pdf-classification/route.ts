import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import sharp from 'sharp';
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

/**
 * Fetches an image from any URL and converts it to a JPEG base64 data URI.
 * Uses sharp to handle WebP, AVIF, HEIC, PNG, GIF → JPEG.
 * react-pdf only supports JPEG, PNG, GIF — JPEG is the safest target.
 */
async function fetchImageAsBase64(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    const res = await fetch(url, {
      signal: controller.signal,
      cache: 'no-store',
      headers: { Accept: 'image/*' },
    });
    clearTimeout(timer);

    if (!res.ok) {
      console.warn(`[pdf-img] HTTP ${res.status} for ${url}`);
      return null;
    }

    const rawBuffer = Buffer.from(await res.arrayBuffer());
    if (rawBuffer.length === 0) {
      console.warn(`[pdf-img] empty buffer for ${url}`);
      return null;
    }

    console.log(`[pdf-img] fetched ${url} — ${rawBuffer.length} bytes, converting to JPEG`);

    // Convert to JPEG — handles WebP, AVIF, HEIC, PNG, GIF, JPEG alike
    const jpegBuffer = await sharp(rawBuffer)
      .jpeg({ quality: 82 })
      .toBuffer();

    const base64 = jpegBuffer.toString('base64');
    console.log(`[pdf-img] JPEG ready — ${base64.length} base64 chars`);

    return `data:image/jpeg;base64,${base64}`;
  } catch (err: any) {
    console.error(`[pdf-img] error for ${url}:`, err?.message ?? err);
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
        items: { include: { product: true } },
      },
    });

    if (!order) return NextResponse.json({ error: 'Non trovato' }, { status: 404 });

    if (session.user.role === 'CUSTOMER' && order.customerId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const validItems = order.items.filter((it) => it.product != null);

    console.log(
      `[pdf] order ${params.id} — ${validItems.length} items, ` +
      `${validItems.filter(it => it.product!.imageUrl).length} with imageUrl`
    );

    // Fetch all images in parallel (converted to JPEG via sharp)
    const imageData = await Promise.all(
      validItems.map((it) =>
        it.product!.imageUrl
          ? fetchImageAsBase64(it.product!.imageUrl)
          : Promise.resolve(null)
      )
    );

    const withImages  = imageData.filter(Boolean).length;
    const withoutImages = imageData.length - withImages;
    console.log(`[pdf] images resolved: ${withImages} OK, ${withoutImages} failed/null`);

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

    const pdfBuffer = await renderToBuffer(
      React.createElement(OrderClassificationPDF, {
        order: serializedOrder as any,
        items: enrichedItems,
        groupBy,
        groupByLabel: GROUP_LABELS[groupBy],
        customerName: order.customer?.companyName ?? '',
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
