import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { createClient } from '@supabase/supabase-js';

const BUCKETS = [
  { name: 'documents', fileSizeLimit: 50 * 1024 * 1024 },   // 50 MB
  { name: 'media',     fileSizeLimit: 500 * 1024 * 1024 },  // 500 MB
] as const;

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase env vars missing');
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const supabase = getSupabaseAdmin();

  const { data: existing, error: listError } = await supabase.storage.listBuckets();
  if (listError) {
    return NextResponse.json({ error: 'Impossibile elencare bucket: ' + listError.message }, { status: 500 });
  }

  const existingNames = new Set((existing ?? []).map((b: { name: string }) => b.name));

  for (const { name, fileSizeLimit } of BUCKETS) {
    if (!existingNames.has(name)) {
      const { error } = await supabase.storage.createBucket(name, {
        public: true,
        fileSizeLimit,
      });
      if (error) {
        return NextResponse.json(
          { error: `Impossibile creare bucket "${name}": ${error.message}` },
          { status: 500 },
        );
      }
    }
  }

  return NextResponse.json({ ok: true });
}
