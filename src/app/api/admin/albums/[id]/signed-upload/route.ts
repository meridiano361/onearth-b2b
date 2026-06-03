import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { createClient } from '@supabase/supabase-js';

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB per photo

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase env vars missing');
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdminRole(session.user.role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { fileName, size } = await req.json() as { fileName: string; size: number };
  if (!fileName) return NextResponse.json({ error: 'fileName mancante' }, { status: 400 });
  if (size > MAX_SIZE) return NextResponse.json({ error: 'File troppo grande (max 10 MB)' }, { status: 400 });

  const ext = fileName.split('.').pop()?.toLowerCase() ?? 'jpg';
  const storageKey = `${params.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const supabase = getSupabaseAdmin();

  // Ensure bucket exists
  const { data: buckets } = await supabase.storage.listBuckets();
  if (!buckets?.some((b: { name: string }) => b.name === 'albums')) {
    const { error } = await supabase.storage.createBucket('albums', { public: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data, error } = await supabase.storage
    .from('albums')
    .createSignedUploadUrl(storageKey);

  if (error || !data) return NextResponse.json({ error: error?.message ?? 'Errore URL firmato' }, { status: 500 });

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publicUrl = `${supabaseUrl}/storage/v1/object/public/albums/${storageKey}`;

  return NextResponse.json({ signedUrl: data.signedUrl, storageKey, publicUrl });
}
