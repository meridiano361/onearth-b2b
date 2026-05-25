import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { createClient } from '@supabase/supabase-js';

const VIDEO_TIPI = ['Video presentazione', 'Video tutorial'];
const AUDIO_TIPI = ['Audio / Podcast'];
const MEDIA_TIPI = [...VIDEO_TIPI, ...AUDIO_TIPI];

const MAX_BY_TIPO: Record<string, number> = {
  'Condizioni Commerciali': 20 * 1024 * 1024,
  'Catalogo PDF':           20 * 1024 * 1024,
  'Video presentazione':   500 * 1024 * 1024,
  'Video tutorial':        500 * 1024 * 1024,
  'Audio / Podcast':       100 * 1024 * 1024,
  'Altro':                  50 * 1024 * 1024,
};

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase env vars missing');
  return createClient(url, key, { auth: { persistSession: false } });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function ensureBucket(supabase: any, bucket: string, fileSizeLimit: number) {
  const { data: buckets } = await supabase.storage.listBuckets();
  if (!buckets?.some((b: { name: string }) => b.name === bucket)) {
    await supabase.storage.createBucket(bucket, { public: true, fileSizeLimit });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { fileName, size, tipo } = await req.json() as {
    fileName: string;
    size: number;
    tipo?: string;
  };

  if (!fileName) return NextResponse.json({ error: 'fileName mancante' }, { status: 400 });

  const resolvedTipo = tipo ?? 'Altro';
  const maxSize = MAX_BY_TIPO[resolvedTipo] ?? MAX_BY_TIPO['Altro'];

  if (size > maxSize) {
    const maxMB = Math.round(maxSize / 1024 / 1024);
    return NextResponse.json(
      { error: `File troppo grande (max ${maxMB} MB per tipo "${resolvedTipo}")` },
      { status: 400 },
    );
  }

  const isMedia = MEDIA_TIPI.includes(resolvedTipo);
  const bucket = isMedia ? 'media' : 'documents';
  const bucketMax = isMedia ? 500 * 1024 * 1024 : 50 * 1024 * 1024;

  const supabase = getSupabaseAdmin();
  await ensureBucket(supabase, bucket, bucketMax);

  // Preserve original extension
  const ext = fileName.includes('.') ? fileName.split('.').pop()!.toLowerCase() : 'bin';
  const storageKey = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUploadUrl(storageKey);

  if (error || !data) {
    return NextResponse.json(
      { error: 'Impossibile creare URL firmato: ' + (error?.message ?? 'unknown') },
      { status: 500 },
    );
  }

  const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(storageKey);

  return NextResponse.json({
    signedUrl: data.signedUrl,
    token: data.token,
    storageKey,
    publicUrl,
    bucket,
  });
}
