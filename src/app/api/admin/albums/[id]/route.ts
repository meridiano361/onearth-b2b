import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { prisma } from '@/lib/prisma';
import { createClient } from '@supabase/supabase-js';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || !isAdminRole(session.user.role)) return null;
  return session;
}

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase env vars missing');
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const album = await prisma.album.findUnique({
    where: { id: params.id },
    include: { foto: { orderBy: { ordine: 'asc' } } },
  });
  if (!album) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({
    data: {
      ...album,
      createdAt: album.createdAt.toISOString(),
      foto: album.foto.map((f) => ({ ...f, createdAt: f.createdAt.toISOString() })),
    },
  });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.nome !== undefined) data.nome = body.nome.trim();
  if (body.cartella !== undefined) data.cartella = body.cartella?.trim() || null;
  if (body.descrizione !== undefined) data.descrizione = body.descrizione?.trim() || null;
  if (body.visibile !== undefined) data.visibile = body.visibile;
  if (body.copertina !== undefined) data.copertina = body.copertina || null;
  if (body.ordine !== undefined) data.ordine = body.ordine;

  const album = await prisma.album.update({ where: { id: params.id }, data });
  return NextResponse.json({ data: { ...album, createdAt: album.createdAt.toISOString() } });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const album = await prisma.album.findUnique({
    where: { id: params.id },
    include: { foto: true },
  });
  if (!album) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Remove all photos from Supabase Storage
  if (album.foto.length > 0) {
    const supabase = getSupabaseAdmin();
    const keys = album.foto
      .map((f) => {
        try {
          const url = new URL(f.url);
          const parts = url.pathname.split('/object/public/albums/');
          return parts[1] ?? null;
        } catch {
          return null;
        }
      })
      .filter(Boolean) as string[];

    if (keys.length > 0) {
      await supabase.storage.from('albums').remove(keys);
    }
  }

  await prisma.album.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
