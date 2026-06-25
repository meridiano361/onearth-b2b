import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getSupabaseClient } from '@/lib/supabase';
import { parseImageFilename } from '@/lib/parseImageFilename';

const BUCKET = 'products';
const ALLOWED = new Set(['ADMIN', 'SUPER_ADMIN']);

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || !ALLOWED.has(session.user.role)) return null;
  return session;
}

// ── GET /api/admin/foto ──────────────────────────────────────────────────────

export async function GET() {
  try {
    if (!await requireAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const supabase = getSupabaseClient();

    const [rootRes, subRes] = await Promise.all([
      supabase.storage.from(BUCKET).list('', { limit: 1000, sortBy: { column: 'created_at', order: 'desc' } }),
      supabase.storage.from(BUCKET).list('products', { limit: 1000, sortBy: { column: 'created_at', order: 'desc' } }),
    ]);

    const IMAGE_EXTS = /\.(jpe?g|png|webp|gif|avif|heic|heif)$/i;

    const rootFiles = (rootRes.data ?? [])
      .filter((f) => f.id !== null && IMAGE_EXTS.test(f.name))
      .map((f) => ({ path: f.name, name: f.name, metadata: f.metadata, created_at: f.created_at ?? null }));

    const subFiles = (subRes.data ?? [])
      .filter((f) => f.id !== null && IMAGE_EXTS.test(f.name))
      .map((f) => ({ path: `products/${f.name}`, name: f.name, metadata: f.metadata, created_at: f.created_at ?? null }));

    const allFiles = [...rootFiles, ...subFiles];

    const urlMap = new Map<string, string>();
    for (const { path } of allFiles) {
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      urlMap.set(path, data.publicUrl);
    }

    // Load ALL products — needed to check sizeVariant codes too
    const products = await prisma.product.findMany({
      select: {
        id: true, code: true, name: true, gruppoMerceologico: true, sizeVariants: true,
        imageUrl: true, imageUrl2: true, imageUrl3: true, imageUrl4: true, imageUrl5: true,
      },
    });

    // Build URL → {product, slot} map and code lookup maps
    const urlToProduct = new Map<string, { id: string; code: string; name: string; slot: number }>();
    const codeToProduct = new Map<string, { id: string; code: string; name: string }>();
    const variantCodeToProduct = new Map<string, { id: string; code: string; name: string }>();

    for (const p of products) {
      codeToProduct.set(p.code.toUpperCase(), p);

      const slots: [string | null, number][] = [
        [p.imageUrl, 1], [p.imageUrl2, 2], [p.imageUrl3, 3],
        [p.imageUrl4, 4], [p.imageUrl5, 5],
      ];
      for (const [url, slot] of slots) {
        if (url && !urlToProduct.has(url)) {
          urlToProduct.set(url, { id: p.id, code: p.code, name: p.name, slot });
        }
      }

      // Index sizeVariant codes for MODA products
      if (
        p.gruppoMerceologico?.toUpperCase() === 'MODA' &&
        Array.isArray(p.sizeVariants)
      ) {
        for (const sv of p.sizeVariants as { taglia: string; codice: string }[]) {
          const cod = sv.codice?.trim();
          if (cod) variantCodeToProduct.set(cod.toUpperCase(), p);
        }
      }
    }

    const photos = allFiles.map(({ path, name, metadata, created_at }) => {
      const url = urlMap.get(path)!;
      const match = urlToProduct.get(url) ?? null;
      const parsed = parseImageFilename(name);

      // da-collegare se: filename valido E (codice diretto O codice taglia MODA)
      const parsedCode = parsed.valid ? parsed.productCode : null;
      const isLinkable = parsedCode
        ? (codeToProduct.has(parsedCode) || variantCodeToProduct.has(parsedCode))
        : false;

      // in-uso: URL presente in uno slot prodotto
      // da-collegare: filename valido il cui codice corrisponde a un prodotto o a una taglia MODA
      // orfana: filename non valido o codice non riconosciuto
      const status: 'in-uso' | 'da-collegare' | 'orfana' = match
        ? 'in-uso'
        : isLinkable
        ? 'da-collegare'
        : 'orfana';

      return {
        path,
        name,
        size: (metadata as any)?.size ?? 0,
        createdAt: created_at ?? new Date().toISOString(),
        url,
        status,
        parsedCode,
        parsedSlot: parsed.valid ? parsed.imageIndex : null,
        product: match
          ? { id: match.id, code: match.code, name: match.name, slot: match.slot }
          : null,
      };
    });

    return NextResponse.json({ data: photos });
  } catch (err) {
    console.error('[admin/foto GET]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ── DELETE /api/admin/foto ───────────────────────────────────────────────────
// body: { paths: string[] }

export async function DELETE(req: NextRequest) {
  try {
    if (!await requireAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { paths } = await req.json() as { paths: string[] };
    if (!Array.isArray(paths) || paths.length === 0) {
      return NextResponse.json({ error: 'paths richiesto' }, { status: 400 });
    }

    const supabase = getSupabaseClient();
    const urls = paths.map((p) => supabase.storage.from(BUCKET).getPublicUrl(p).data.publicUrl);

    const { error } = await supabase.storage.from(BUCKET).remove(paths);
    if (error) throw new Error(error.message);

    // Detach deleted images from all 5 slots
    await Promise.all([
      prisma.product.updateMany({ where: { imageUrl:  { in: urls } }, data: { imageUrl:  null } }),
      prisma.product.updateMany({ where: { imageUrl2: { in: urls } }, data: { imageUrl2: null } }),
      prisma.product.updateMany({ where: { imageUrl3: { in: urls } }, data: { imageUrl3: null } }),
      prisma.product.updateMany({ where: { imageUrl4: { in: urls } }, data: { imageUrl4: null } }),
      prisma.product.updateMany({ where: { imageUrl5: { in: urls } }, data: { imageUrl5: null } }),
    ]);

    return NextResponse.json({ deleted: paths.length });
  } catch (err) {
    console.error('[admin/foto DELETE]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
