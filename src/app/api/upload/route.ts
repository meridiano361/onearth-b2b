import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const BUCKET = 'products';

const mimeToExt: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/avif': '.avif',
  'image/heic': '.heic',
  'image/heif': '.heif',
};

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Accesso negato' }, { status: 403 });

    // Crea client inline con fallback sui nomi delle variabili
    const supabaseUrl =
      process.env.SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    console.log('[upload] env check:', {
      SUPABASE_URL: !!process.env.SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      SUPABASE_ANON_KEY: !!process.env.SUPABASE_ANON_KEY,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      resolved_url: !!supabaseUrl,
      resolved_key: !!supabaseKey,
    });

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({
        error: `Variabili Supabase mancanti su Vercel. URL: ${!!supabaseUrl}, KEY: ${!!supabaseKey}`,
      }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });

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
      return NextResponse.json({ error: 'File troppo grande (max 5MB)' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const ext = mimeToExt[file.type] ?? (path.extname(file.name).toLowerCase() || '.jpg');
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(filename, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      console.error('[upload] Supabase error:', JSON.stringify(error));
      return NextResponse.json({ error: 'Upload fallito: ' + error.message }, { status: 500 });
    }

    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(filename);

    return NextResponse.json({ url: publicUrl });
  } catch (err: any) {
    console.error('[upload] Exception:', err?.message, err?.stack);
    return NextResponse.json({ error: 'Errore: ' + (err?.message || 'sconosciuto') }, { status: 500 });
  }
}
