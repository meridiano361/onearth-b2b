import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { prisma } from '@/lib/prisma';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const BUCKET = 'documents';

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  return createClient(url!, key!, { auth: { persistSession: false } });
}

const patchSchema = z.object({
  nome:     z.string().min(1).optional(),
  tipo:     z.string().min(1).optional(),
  visibile: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Handle both JSON (metadata update) and multipart (file replacement)
  const contentType = req.headers.get('content-type') ?? '';

  if (contentType.includes('multipart/form-data')) {
    // File replacement
    const formData = await req.formData();
    const file = formData.get('file');
    const nome = (formData.get('nome') as string | null)?.trim();
    const tipo = (formData.get('tipo') as string | null)?.trim();
    const visibile = formData.get('visibile') !== 'false';

    if (!file || typeof file === 'string') return NextResponse.json({ error: 'File mancante' }, { status: 400 });

    const existing = await prisma.document.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const supabase = getSupabase();

    // Delete old file
    await supabase.storage.from(BUCKET).remove([existing.storageKey]);

    // Upload new file
    const storageKey = `${Date.now()}-${Math.random().toString(36).slice(2)}.pdf`;
    const bytes = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storageKey, Buffer.from(bytes), { contentType: 'application/pdf', upsert: false });

    if (uploadError) return NextResponse.json({ error: 'Upload fallito: ' + uploadError.message }, { status: 500 });

    const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(storageKey);

    const doc = await prisma.document.update({
      where: { id: params.id },
      data: {
        ...(nome ? { nome } : {}),
        ...(tipo ? { tipo } : {}),
        visibile,
        url: publicUrl,
        storageKey,
        size: file.size,
      },
    });
    return NextResponse.json({ data: { ...doc, createdAt: doc.createdAt.toISOString() } });
  }

  // JSON metadata update
  const body = await req.json();
  const data = patchSchema.parse(body);
  const doc = await prisma.document.update({ where: { id: params.id }, data });
  return NextResponse.json({ data: { ...doc, createdAt: doc.createdAt.toISOString() } });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const existing = await prisma.document.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const supabase = getSupabase();
  await supabase.storage.from(BUCKET).remove([existing.storageKey]);
  await prisma.document.delete({ where: { id: params.id } });

  return NextResponse.json({ ok: true });
}
