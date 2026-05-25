import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { prisma } from '@/lib/prisma';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const BUCKET = 'documents';

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase env vars missing');
  return createClient(url, key, { auth: { persistSession: false } });
}

const patchSchema = z.object({
  nome:       z.string().min(1).optional(),
  tipo:       z.string().min(1).optional(),
  visibile:   z.boolean().optional(),
  // Presenti solo se il file è stato sostituito
  url:        z.string().url().optional(),
  storageKey: z.string().min(1).optional(),
  size:       z.number().positive().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const data = patchSchema.parse(body);

  const existing = await prisma.document.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Se è arrivato un nuovo storageKey, elimina il vecchio file da Supabase
  if (data.storageKey && data.storageKey !== existing.storageKey) {
    const supabase = getSupabaseAdmin();
    await supabase.storage.from(BUCKET).remove([existing.storageKey]);
  }

  const doc = await prisma.document.update({
    where: { id: params.id },
    data: {
      ...(data.nome       !== undefined ? { nome:       data.nome }       : {}),
      ...(data.tipo       !== undefined ? { tipo:       data.tipo }       : {}),
      ...(data.visibile   !== undefined ? { visibile:   data.visibile }   : {}),
      ...(data.url        !== undefined ? { url:        data.url }        : {}),
      ...(data.storageKey !== undefined ? { storageKey: data.storageKey } : {}),
      ...(data.size       !== undefined ? { size:       data.size }       : {}),
    },
  });

  return NextResponse.json({ data: { ...doc, createdAt: doc.createdAt.toISOString() } });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const existing = await prisma.document.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const supabase = getSupabaseAdmin();
  await supabase.storage.from(BUCKET).remove([existing.storageKey]);
  await prisma.document.delete({ where: { id: params.id } });

  return NextResponse.json({ ok: true });
}
