import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { createClient } from '@supabase/supabase-js';
import { compressImage } from '@/lib/imageOptimize';

const MAX_SIZE = 20 * 1024 * 1024; // 20 MB input limit (will be compressed to ≤200 KB)
const BUCKET = 'products';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    if (!isAdminRole(session.user.role)) return NextResponse.json({ error: 'Accesso negato' }, { status: 403 });

    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({
        error: `Variabili Supabase mancanti. URL: ${!!supabaseUrl}, KEY: ${!!supabaseKey}`,
      }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

    const formData = await req.formData();
    const file = formData.get('file');

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'Nessun file fornito' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: `Formato non supportato: ${file.type || '(sconosciuto)'}. Usa JPG, PNG o WebP.` },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File troppo grande (max 20 MB)' }, { status: 400 });
    }

    const raw = Buffer.from(await file.arrayBuffer());

    // Compress + resize to ≤200 KB / 1500×1500 px WebP
    const compressed = await compressImage(raw);

    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.webp`;

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(filename, compressed, { contentType: 'image/webp', upsert: false });

    if (error) {
      console.error('[upload] Supabase error:', JSON.stringify(error));
      return NextResponse.json({ error: 'Upload fallito: ' + error.message }, { status: 500 });
    }

    const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(filename);

    return NextResponse.json({ url: publicUrl });
  } catch (err: any) {
    console.error('[upload] Exception:', err?.message, err?.stack);
    return NextResponse.json({ error: 'Errore: ' + (err?.message || 'sconosciuto') }, { status: 500 });
  }
}
