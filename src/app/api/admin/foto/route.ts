import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getSupabaseClient } from '@/lib/supabase';

const BUCKET = 'products';
const ALLOWED = new Set(['ADMIN', 'SUPER_ADMIN']);

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || !ALLOWED.has(session.user.role)) return null;
  return session;
}

// ── GET /api/admin/foto ──────────────────────────────────────────────────────
// Returns all photos from Supabase Storage + product match info

export async function GET() {
  try {
    if (!await requireAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const supabase = getSupabaseClient();

    // List root + 'products/' subfolder (two upload paths used by the app)
    const [rootRes, subRes] = await Promise.all([
      supabase.storage.from(BUCKET).list('', { limit: 1000, sortBy: { column: 'created_at', order: 'desc' } }),
      supabase.storage.from(BUCKET).list('products', { limit: 1000, sortBy: { column: 'created_at', order: 'desc' } }),
    ]);

    const IMAGE_EXTS = /\.(jpe?g|png|webp|gif|avif|heic|heif)$/i;

    const rootFiles: { path: string; name: string; metadata: Record<string, any> | null; created_at: string | null }[] =
      (rootRes.data ?? [])
        .filter((f) => f.id !== null && IMAGE_EXTS.test(f.name))
        .map((f) => ({ path: f.name, name: f.name, metadata: f.metadata, created_at: f.created_at ?? null }));

    const subFiles: { path: string; name: string; metadata: Record<string, any> | null; created_at: string | null }[] =
      (subRes.data ?? [])
        .filter((f) => f.id !== null && IMAGE_EXTS.test(f.name))
        .map((f) => ({ path: `products/${f.name}`, name: f.name, metadata: f.metadata, created_at: f.created_at ?? null }));

    const allFiles = [...rootFiles, ...subFiles];

    // Build URL map: path → publicUrl
    const urlMap = new Map<string, string>();
    for (const { path } of allFiles) {
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      urlMap.set(path, data.publicUrl);
    }

    // Fetch all products that have an imageUrl set
    const products = await prisma.product.findMany({
      where: { imageUrl: { not: null } },
      select: { id: true, code: true, name: true, imageUrl: true },
    });
    const productByUrl = new Map(products.map((p) => [p.imageUrl!, p]));

    const photos = allFiles.map(({ path, name, metadata, created_at }) => {
      const url = urlMap.get(path)!;
      const product = productByUrl.get(url) ?? null;
      return {
        path,
        name,
        size: (metadata as any)?.size ?? 0,
        createdAt: created_at ?? new Date().toISOString(),
        url,
        product: product ? { id: product.id, code: product.code, name: product.name } : null,
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

    // Compute public URLs before deleting so we can clear product imageUrls
    const urls = paths.map((p) => supabase.storage.from(BUCKET).getPublicUrl(p).data.publicUrl);

    const { error } = await supabase.storage.from(BUCKET).remove(paths);
    if (error) throw new Error(error.message);

    // Detach deleted images from products
    await prisma.product.updateMany({
      where: { imageUrl: { in: urls } },
      data: { imageUrl: null },
    });

    return NextResponse.json({ deleted: paths.length });
  } catch (err) {
    console.error('[admin/foto DELETE]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
