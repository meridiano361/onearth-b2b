import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      console.error('[upload] No session found');
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }
    if (session.user.role !== 'ADMIN') {
      console.error('[upload] User is not ADMIN:', session.user.role);
      return NextResponse.json({ error: 'Accesso negato' }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get('file');

    if (!file || typeof file === 'string') {
      console.error('[upload] No file in formData, keys:', [...formData.keys()]);
      return NextResponse.json({ error: 'Nessun file fornito' }, { status: 400 });
    }

    // Accept any image/* MIME type (browsers may send image/jpg, image/jpeg, etc.)
    if (!file.type.startsWith('image/')) {
      console.error('[upload] Rejected MIME type:', file.type);
      return NextResponse.json(
        { error: `Formato non supportato: ${file.type || '(sconosciuto)'}. Usa JPG, PNG o WebP.` },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File troppo grande (max 5MB)' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Determine extension from MIME type (more reliable than file.name)
    const mimeToExt: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'image/gif': '.gif',
      'image/avif': '.avif',
      'image/heic': '.heic',
      'image/heif': '.heif',
    };
    const ext = mimeToExt[file.type] ?? (path.extname(file.name).toLowerCase() || '.jpg');
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'products');
    await mkdir(uploadDir, { recursive: true });

    const filepath = path.join(uploadDir, filename);
    await writeFile(filepath, buffer);
    console.log('[upload] Saved:', filepath);

    return NextResponse.json({ url: `/uploads/products/${filename}` });
  } catch (err) {
    console.error('[upload] Unexpected error:', err);
    return NextResponse.json({ error: 'Caricamento fallito' }, { status: 500 });
  }
}
