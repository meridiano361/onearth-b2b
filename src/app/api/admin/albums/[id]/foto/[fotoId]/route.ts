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
  return createClient(url!, key!, { auth: { persistSession: false } });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; fotoId: string } },
) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.didascalia !== undefined) data.didascalia = body.didascalia?.trim() || null;
  if (body.ordine !== undefined) data.ordine = body.ordine;

  const foto = await prisma.albumFoto.update({ where: { id: params.fotoId }, data });
  return NextResponse.json({ data: { ...foto, createdAt: foto.createdAt.toISOString() } });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; fotoId: string } },
) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const foto = await prisma.albumFoto.findUnique({ where: { id: params.fotoId } });
  if (!foto) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Remove from Supabase Storage
  try {
    const url = new URL(foto.url);
    const parts = url.pathname.split('/object/public/albums/');
    const storageKey = parts[1];
    if (storageKey) {
      const supabase = getSupabaseAdmin();
      await supabase.storage.from('albums').remove([storageKey]);
    }
  } catch { /* URL parsing failed, skip storage deletion */ }

  await prisma.albumFoto.delete({ where: { id: params.fotoId } });

  // If deleted photo was the cover, update to first remaining photo
  const album = await prisma.album.findUnique({ where: { id: params.id } });
  if (album?.copertina === foto.url) {
    const first = await prisma.albumFoto.findFirst({
      where: { albumId: params.id },
      orderBy: { ordine: 'asc' },
    });
    await prisma.album.update({
      where: { id: params.id },
      data: { copertina: first?.url ?? null },
    });
  }

  return NextResponse.json({ ok: true });
}
