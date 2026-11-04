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

  const buffer = await upstream.arrayBuffer();
  const contentType = upstream.headers.get('content-type') ?? 'image/jpeg';
  const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
  const rawName = req.nextUrl.searchParams.get('filename') ?? `immagine.${ext}`;
  // RFC 5987: solo ASCII nel filename, caratteri speciali via filename*
  const safeName = rawName.replace(/[^\x20-\x7E]/g, '_');

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(rawName)}`,
    },
  });
}
