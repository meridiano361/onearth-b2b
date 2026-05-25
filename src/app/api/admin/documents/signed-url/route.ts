import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { createClient } from '@supabase/supabase-js';

const BUCKET = 'documents';
const MAX_SIZE = 50 * 1024 * 1024; // 50 MB

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase env vars missing');
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { fileName, size } = await req.json() as { fileName: string; size: number };

  if (!fileName) return NextResponse.json({ error: 'fileName mancante' }, { status: 400 });
  if (size > MAX_SIZE) {
    return NextResponse.json(
      { error: `File troppo grande (max ${MAX_SIZE / 1024 / 1024} MB)` },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdmin();

  // Crea il bucket se non esiste ancora
  const { data: buckets } = await supabase.storage.listBuckets();
  if (!buckets?.some((b) => b.name === BUCKET)) {
    await supabase.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: MAX_SIZE,
    });
  }

  const storageKey = `${Date.now()}-${Math.random().toString(36).slice(2)}.pdf`;

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUploadUrl(storageKey);

  if (error || !data) {
    return NextResponse.json(
      { error: 'Impossibile creare URL firmato: ' + (error?.message ?? 'unknown') },
      { status: 500 },
    );
  }

  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(storageKey);

  return NextResponse.json({ signedUrl: data.signedUrl, token: data.token, storageKey, publicUrl });
}
