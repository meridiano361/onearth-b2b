import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { prisma } from '@/lib/prisma';

// Normalise a Pantone code for comparison: uppercase, collapse whitespace/dashes.
// "18-1550 tcx" and "18-1550-TCX" and "18 1550 TCX" all map to "181550TCX".
function normalise(code: string) {
  return code.toUpperCase().replace(/[\s\-]+/g, '');
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const code = req.nextUrl.searchParams.get('code')?.trim();
  if (!code) return NextResponse.json({ error: 'code param required' }, { status: 400 });

  const norm = normalise(code);

  try {
    const rows = await prisma.$queryRaw<
      { id: bigint; code: string; name: string; hex_code: string; system_type: string }[]
    >`
      SELECT id, code, name, hex_code, system_type
      FROM   public.pantone_colors
      WHERE  UPPER(REGEXP_REPLACE(code, '[\\s\\-]+', '', 'g')) = ${norm}
      LIMIT  1
    `;

    if (rows.length > 0) {
      const r = rows[0];
      return NextResponse.json({
        found: true,
        color: { id: Number(r.id), code: r.code, name: r.name, hex_code: r.hex_code, system_type: r.system_type },
      });
    }

    return NextResponse.json({ found: false });
  } catch (err: any) {
    console.error('[pantone-lookup] error:', err.message);
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 });
  }
}
