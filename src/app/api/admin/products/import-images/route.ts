import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { prisma } from '@/lib/prisma';
import { getSupabaseClient } from '@/lib/supabase';
import { parseImageFilename, imageIndexToField, invalidReason } from '@/lib/parseImageFilename';

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

    // ── Parsing ──────────────────────────────────────────────────────────────
    type ValidEntry = { file: File; productCode: string; imageIndex: number };
    const validEntries: ValidEntry[] = [];
    const nonConforming: Array<{ file: string; message: string }> = [];

    for (const file of files) {
      const parsed = parseImageFilename(file.name);
      if (!parsed.valid) {
        nonConforming.push({ file: file.name, message: invalidReason(parsed.reason) });
      } else {
        validEntries.push({ file, productCode: parsed.productCode, imageIndex: parsed.imageIndex });
      }
    }

    if (!validEntries.length) {
      return NextResponse.json({
        uploaded: 0, notFound: [], errors: [], nonConforming, total: files.length,
      });
    }

    // ── Lookup prodotti ───────────────────────────────────────────────────────
    const uniqueCodes = [...new Set(validEntries.map((e) => e.productCode))];
    const products = await prisma.product.findMany({
      where: { code: { in: uniqueCodes } },
      select: { id: true, code: true },
    });
    const productByCode = new Map(products.map((p) => [p.code, p.id]));

    const notFound: string[] = uniqueCodes.filter((c) => !productByCode.has(c));

    // ── Upload e aggiornamento per slot ───────────────────────────────────────
    const supabase = getSupabaseClient();
    let uploaded = 0;
    const errors: Array<{ file: string; message: string }> = [];

    for (const { file, productCode, imageIndex } of validEntries) {
      const productId = productByCode.get(productCode);
      if (!productId) continue; // già in notFound

      try {
        const buffer = Buffer.from(await file.arrayBuffer());
        const storagePath = `products/${file.name}`;

        const { error: uploadError } = await supabase.storage
          .from('products')
          .upload(storagePath, buffer, { contentType: file.type || 'image/jpeg', upsert: true });

        if (uploadError) throw new Error(uploadError.message);

        const { data: urlData } = supabase.storage.from('products').getPublicUrl(storagePath);
        const field = imageIndexToField(imageIndex);

        await prisma.product.update({
          where: { id: productId },
          data: { [field]: urlData.publicUrl },
        });

        uploaded++;
      } catch (err: any) {
        errors.push({ file: file.name, message: err.message || 'Upload fallito' });
      }
    }

    return NextResponse.json({
      uploaded,
      notFound,
      errors,
      nonConforming,
      total: files.length,
    });
  } catch (err) {
    console.error('Image import error:', err);
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 });
  }
}
