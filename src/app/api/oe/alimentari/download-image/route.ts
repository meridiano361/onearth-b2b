import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  if (!url) return NextResponse.json({ error: 'url mancante' }, { status: 400 });

  let upstream: Response;
  try {
    upstream = await fetch(url);
  } catch {
    return NextResponse.json({ error: 'Fetch fallito' }, { status: 502 });
  }
  if (!upstream.ok) return NextResponse.json({ error: 'Immagine non trovata' }, { status: 404 });

  const buffer = await upstream.arrayBuffer();
  const contentType = upstream.headers.get('content-type') ?? 'image/jpeg';
  const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
  const rawName = req.nextUrl.searchParams.get('filename') ?? `immagine.${ext}`;
  const safeName = rawName.replace(/[^\x20-\x7E]/g, '_');

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(rawName)}`,
    },
  });
}
