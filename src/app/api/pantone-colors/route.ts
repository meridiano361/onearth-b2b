import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { getSupabaseClient } from '@/lib/supabase';
import { prisma } from '@/lib/prisma';

/** Legge il claim "role" dal payload JWT senza librerie esterne. */
function decodeJwtRole(key: string | undefined): string {
  if (!key) return 'MISSING';
  try {
    const payload = JSON.parse(Buffer.from(key.split('.')[1], 'base64').toString('utf8'));
    return payload.role ?? 'unknown';
  } catch {
    return 'invalid-jwt';
  }
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const keyRole = decodeJwtRole(key);

  console.log('[pantone-colors] SUPABASE_URL present:', !!url, url ? `(${url.slice(8, 35)}...)` : 'MISSING');
  console.log('[pantone-colors] SUPABASE_SERVICE_ROLE_KEY present:', !!key);
  console.log('[pantone-colors] key JWT role:', keyRole);
  console.log('[pantone-colors] target: public.pantone_colors WHERE system_type = FHI-TCX');

  // ── Tentativo 1: Supabase PostgREST ──────────────────────────────────────────
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('pantone_colors')
    .select('code, name, hex_code, system_type')
    .eq('system_type', 'FHI-TCX')
    .order('code', { ascending: true });

  if (!error) {
    console.log('[pantone-colors] Supabase OK, rows:', data?.length ?? 0);
    return NextResponse.json({ data });
  }

  console.error('[pantone-colors] Supabase error:', {
    code:    error.code,
    message: error.message,
    details: error.details,
    hint:    error.hint,
    keyRole,
    keyPresent: !!key,
  });

  // ── Tentativo 2: Prisma $queryRaw (bypassa PostgREST) ────────────────────────
  // Necessario quando SUPABASE_SERVICE_ROLE_KEY non è configurata su Vercel
  // oppure quando PostgREST rigetta la richiesta per motivi di permesso.
  console.log('[pantone-colors] Fallback → Prisma direct query...');
  try {
    const rows = await prisma.$queryRaw<
      { code: string; name: string; hex_code: string; system_type: string }[]
    >`
      SELECT code, name, hex_code, system_type
      FROM   public.pantone_colors
      WHERE  system_type = 'FHI-TCX'
      ORDER  BY code ASC
    `;
    console.log('[pantone-colors] Prisma fallback OK, rows:', rows.length);
    return NextResponse.json({ data: rows });
  } catch (prismaErr: any) {
    console.error('[pantone-colors] Prisma fallback error:', prismaErr.message);
    return NextResponse.json(
      {
        error: error.message,
        supabaseDetail: {
          code:    error.code,
          message: error.message,
          details: error.details,
          hint:    error.hint,
          keyRole,
          keyPresent: !!key,
        },
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { code, name, hex_code, system_type } = await req.json();

    if (!code?.trim() || !name?.trim() || !hex_code?.trim()) {
      return NextResponse.json({ error: 'code, name e hex_code sono obbligatori' }, { status: 400 });
    }

    const safeType = (system_type?.trim()) || 'FHI-TCX';

    const rows = await prisma.$queryRaw<
      { id: bigint; code: string; name: string; hex_code: string; system_type: string }[]
    >`
      INSERT INTO public.pantone_colors (code, name, hex_code, system_type)
      VALUES (${code.trim()}, ${name.trim()}, ${hex_code.trim()}, ${safeType})
      RETURNING id, code, name, hex_code, system_type
    `;

    const row = rows[0];
    console.log('[pantone-colors] POST created:', row.code, row.name);
    return NextResponse.json({ data: { ...row, id: Number(row.id) } }, { status: 201 });
  } catch (err: any) {
    if (err.code === '23505') {
      return NextResponse.json({ error: 'Codice Pantone già esistente' }, { status: 409 });
    }
    console.error('[pantone-colors] POST error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
