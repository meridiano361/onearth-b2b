import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSupabaseClient } from '@/lib/supabase';
import { notifyAdmin } from '@/lib/adminNotify';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const BUCKET = 'products';
const IMAGE_EXTS = /\.(jpe?g|png|webp|gif|avif|heic|heif)$/i;

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // Vercel sets Authorization: Bearer {CRON_SECRET} on scheduled invocations
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const supabase = getSupabaseClient();

    // List all image files from both root and products/ subfolder
    const [rootRes, subRes] = await Promise.all([
      supabase.storage.from(BUCKET).list('', { limit: 2000, sortBy: { column: 'created_at', order: 'asc' } }),
      supabase.storage.from(BUCKET).list('products', { limit: 2000, sortBy: { column: 'created_at', order: 'asc' } }),
    ]);

    const now = Date.now();
    const allFiles: { path: string; url: string; createdAt: string }[] = [];

    for (const f of (rootRes.data ?? [])) {
      if (!f.id || !IMAGE_EXTS.test(f.name)) continue;
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(f.name);
      allFiles.push({ path: f.name, url: data.publicUrl, createdAt: f.created_at ?? '' });
    }
    for (const f of (subRes.data ?? [])) {
      if (!f.id || !IMAGE_EXTS.test(f.name)) continue;
      const path = `products/${f.name}`;
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      allFiles.push({ path, url: data.publicUrl, createdAt: f.created_at ?? '' });
    }

    // Build set of all URLs currently used by any product image slot
    const products = await prisma.product.findMany({
      where: {
        OR: [
          { imageUrl:  { not: null } },
          { imageUrl2: { not: null } },
          { imageUrl3: { not: null } },
          { imageUrl4: { not: null } },
          { imageUrl5: { not: null } },
        ],
      },
      select: { imageUrl: true, imageUrl2: true, imageUrl3: true, imageUrl4: true, imageUrl5: true },
    });

    const usedUrls = new Set<string>();
    for (const p of products) {
      if (p.imageUrl)  usedUrls.add(p.imageUrl);
      if (p.imageUrl2) usedUrls.add(p.imageUrl2);
      if (p.imageUrl3) usedUrls.add(p.imageUrl3);
      if (p.imageUrl4) usedUrls.add(p.imageUrl4);
      if ((p as any).imageUrl5) usedUrls.add((p as any).imageUrl5);
    }

    // Find orphans older than 30 days
    const oldOrphans = allFiles.filter(({ url, createdAt }) => {
      if (usedUrls.has(url)) return false;
      if (!createdAt) return false;
      return now - new Date(createdAt).getTime() > THIRTY_DAYS_MS;
    });

    if (oldOrphans.length === 0) {
      return NextResponse.json({ checked: allFiles.length, oldOrphans: 0 });
    }

    await notifyAdmin({
      title: `${oldOrphans.length} foto orfane da eliminare`,
      body: `Hai ${oldOrphans.length} foto nel bucket non collegate a nessun prodotto da oltre 30 giorni. Vuoi eliminarle?`,
      url: '/admin/foto',
    });

    return NextResponse.json({ checked: allFiles.length, oldOrphans: oldOrphans.length });
  } catch (err: any) {
    console.error('[cron/orphan-foto]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
