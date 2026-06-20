import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSupabaseClient } from '@/lib/supabase';
import { compressImage } from '@/lib/imageOptimize';

const BUCKET = 'products';
const MAX_BYTES = 200 * 1024;
const ALLOWED = new Set(['ADMIN', 'SUPER_ADMIN']);
const IMAGE_EXTS = /\.(jpe?g|png|webp|gif|avif|heic|heif)$/i;

// POST /api/admin/foto/ottimizza
// Scans the bucket for images > 200 KB, compresses them in-place (same path, upsert).
// Safe to call multiple times — skips files already ≤ 200 KB.

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !ALLOWED.has(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const supabase = getSupabaseClient();

    const [rootRes, subRes] = await Promise.all([
      supabase.storage.from(BUCKET).list('', { limit: 1000, sortBy: { column: 'created_at', order: 'desc' } }),
      supabase.storage.from(BUCKET).list('products', { limit: 1000, sortBy: { column: 'created_at', order: 'desc' } }),
    ]);

    const allFiles = [
      ...(rootRes.data ?? [])
        .filter((f) => f.id !== null && IMAGE_EXTS.test(f.name))
        .map((f) => ({ path: f.name, size: (f.metadata as any)?.size ?? 0 })),
      ...(subRes.data ?? [])
        .filter((f) => f.id !== null && IMAGE_EXTS.test(f.name))
        .map((f) => ({ path: `products/${f.name}`, size: (f.metadata as any)?.size ?? 0 })),
    ];

    // Only process files whose known size exceeds the limit (skip unknowns to be safe)
    const toProcess = allFiles.filter((f) => f.size > MAX_BYTES);

    let processed = 0;
    let skipped   = 0;
    let errors    = 0;

    for (const { path } of toProcess) {
      try {
        const { data: blob, error: dlErr } = await supabase.storage.from(BUCKET).download(path);
        if (dlErr || !blob) { errors++; continue; }

        const raw = Buffer.from(await blob.arrayBuffer());
        const compressed = await compressImage(raw);

        // Re-upload to the same path; URL in the DB stays valid
        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(path, compressed, { contentType: 'image/webp', upsert: true });

        if (upErr) { errors++; continue; }

        processed++;
      } catch {
        errors++;
      }
    }

    skipped = allFiles.length - toProcess.length;

    return NextResponse.json({ processed, skipped, errors, total: allFiles.length });
  } catch (err) {
    console.error('[foto/ottimizza]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
