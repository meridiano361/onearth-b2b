import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isMeridiano361Org } from '@/lib/modaServer';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const ok = await isMeridiano361Org(session.user.role, session.user.organizationId);
  if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const url = req.nextUrl.searchParams.get('url');
  if (!url) return NextResponse.json({ error: 'url mancante' }, { status: 400 });

  const upstream = await fetch(url);
  if (!upstream.ok) return NextResponse.json({ error: 'Immagine non trovata' }, { status: 404 });

  const contentType = upstream.headers.get('content-type') ?? 'image/jpeg';
  const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
  const filename = req.nextUrl.searchParams.get('filename') ?? `immagine.${ext}`;

  return new NextResponse(upstream.body, {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
