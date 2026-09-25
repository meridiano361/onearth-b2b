import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { createClient } from '@supabase/supabase-js';

const BUCKET = 'products';
const MAX_SIZE = 20 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
  if (!isAdminRole(session.user.role) && !session.user.isMeridiano361) {
    return NextResponse.json({ error: 'Accesso negato' }, { status: 403 });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: `Config Supabase mancante (url:${!!supabaseUrl} key:${!!supabaseKey})` }, { status: 500 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch (e) {
    return NextResponse.json({ error: 'Impossibile leggere il form: ' + String(e) }, { status: 400 });
  }

  const file = formData.get('file');
  if (!file || typeof file === 'string') return NextResponse.json({ error: 'Nessun file nel body' }, { status: 400 });
  if (file.size > MAX_SIZE) return NextResponse.json({ error: 'File troppo grande (max 20 MB)' }, { status: 400 });

  let raw: Buffer;
  try {
    raw = Buffer.from(await file.arrayBuffer());
  } catch (e) {
    return NextResponse.json({ error: 'Lettura file fallita: ' + String(e) }, { status: 500 });
  }

  // Skip compression — upload directly as-is to avoid sharp HEIC issues
  const ext = file.name?.split('.').pop()?.toLowerCase() ?? 'bin';
  const mimeType = file.type || 'application/octet-stream';
  const filename = `oe-settings/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
  const { error } = await supabase.storage.from(BUCKET).upload(filename, raw, { contentType: mimeType, upsert: false });
  if (error) {
    return NextResponse.json({ error: 'Supabase upload fallito: ' + error.message }, { status: 500 });
  }

  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(filename);
  return NextResponse.json({ url: publicUrl });
}
