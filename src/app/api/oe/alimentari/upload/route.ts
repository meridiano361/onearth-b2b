import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isMeridiano361Org } from '@/lib/modaServer';
import { createClient } from '@supabase/supabase-js';
import { compressImage } from '@/lib/imageOptimize';

const BUCKET = 'products';
const MAX_SIZE = 20 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
  const ok = await isMeridiano361Org(session.user.role, session.user.organizationId);
  if (!ok) return NextResponse.json({ error: 'Accesso negato' }, { status: 403 });

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return NextResponse.json({ error: 'Config Supabase mancante' }, { status: 500 });

  const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
  const formData = await req.formData();
  const file = formData.get('file');

  if (!file || typeof file === 'string') return NextResponse.json({ error: 'Nessun file' }, { status: 400 });
  if (!file.type.startsWith('image/')) return NextResponse.json({ error: 'Solo immagini' }, { status: 400 });
  if (file.size > MAX_SIZE) return NextResponse.json({ error: 'File troppo grande (max 20 MB)' }, { status: 400 });

  const raw = Buffer.from(await file.arrayBuffer());
  const compressed = await compressImage(raw);
  const filename = `oe-alimentari/${Date.now()}-${Math.random().toString(36).slice(2)}.webp`;

  const { error } = await supabase.storage.from(BUCKET).upload(filename, compressed, { contentType: 'image/webp', upsert: false });
  if (error) return NextResponse.json({ error: 'Upload fallito: ' + error.message }, { status: 500 });

  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(filename);
  return NextResponse.json({ url: publicUrl });
}
