import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { prisma } from '@/lib/prisma';
import { createClient } from '@supabase/supabase-js';

const BUCKET = 'documents';
const MAX_SIZE = 20 * 1024 * 1024; // 20MB

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  return createClient(url!, key!, { auth: { persistSession: false } });
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const docs = await prisma.document.findMany({ orderBy: { createdAt: 'desc' } });
  return NextResponse.json({ data: docs.map((d) => ({ ...d, createdAt: d.createdAt.toISOString() })) });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get('file');
  const nome = (formData.get('nome') as string)?.trim();
  const tipo = (formData.get('tipo') as string)?.trim();
  const visibile = formData.get('visibile') !== 'false';

  if (!file || typeof file === 'string') return NextResponse.json({ error: 'File mancante' }, { status: 400 });
  if (!nome) return NextResponse.json({ error: 'Nome mancante' }, { status: 400 });
  if (!tipo) return NextResponse.json({ error: 'Tipo mancante' }, { status: 400 });
  if (file.size > MAX_SIZE) return NextResponse.json({ error: 'File troppo grande (max 20MB)' }, { status: 400 });

  const supabase = getSupabase();

  // Ensure bucket exists
  const { data: buckets } = await supabase.storage.listBuckets();
  const exists = buckets?.some((b) => b.name === BUCKET);
  if (!exists) {
    await supabase.storage.createBucket(BUCKET, { public: true });
  }

  const storageKey = `${Date.now()}-${Math.random().toString(36).slice(2)}.pdf`;
  const bytes = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storageKey, Buffer.from(bytes), { contentType: 'application/pdf', upsert: false });

  if (uploadError) {
    return NextResponse.json({ error: 'Upload fallito: ' + uploadError.message }, { status: 500 });
  }

  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(storageKey);

  const doc = await prisma.document.create({
    data: { nome, tipo, url: publicUrl, storageKey, size: file.size, visibile },
  });

  return NextResponse.json({ data: { ...doc, createdAt: doc.createdAt.toISOString() } });
}
