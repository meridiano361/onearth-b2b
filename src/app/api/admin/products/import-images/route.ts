import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { prisma } from '@/lib/prisma';
import { getSupabaseClient } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const formData = await req.formData();
    const files = formData.getAll('files') as File[];

    if (!files.length) {
      return NextResponse.json({ error: 'Nessun file ricevuto' }, { status: 400 });
    }

    const supabase = getSupabaseClient();
    let uploaded = 0;
    const notFound: string[] = [];
    const errors: Array<{ file: string; message: string }> = [];

    for (const file of files) {
      const ext = file.name.includes('.') ? file.name.substring(file.name.lastIndexOf('.')) : '';
      const code = file.name.replace(/\.[^/.]+$/, '').toUpperCase().trim();

      if (!code) {
        errors.push({ file: file.name, message: 'Nome file non valido' });
        continue;
      }

      const product = await prisma.product.findUnique({ where: { code }, select: { id: true } });
      if (!product) {
        notFound.push(code);
        continue;
      }

      try {
        const buffer = Buffer.from(await file.arrayBuffer());
        const storagePath = `products/${file.name}`;

        const { error: uploadError } = await supabase.storage
          .from('products')
          .upload(storagePath, buffer, { contentType: file.type || 'image/jpeg', upsert: true });

        if (uploadError) throw new Error(uploadError.message);

        const { data: urlData } = supabase.storage.from('products').getPublicUrl(storagePath);
        const imageUrl = urlData.publicUrl;

        await prisma.product.update({ where: { id: product.id }, data: { imageUrl } });
        uploaded++;
      } catch (err: any) {
        errors.push({ file: file.name, message: err.message || 'Upload fallito' });
      }
    }

    return NextResponse.json({ uploaded, notFound, errors, total: files.length });
  } catch (err) {
    console.error('Image import error:', err);
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 });
  }
}
