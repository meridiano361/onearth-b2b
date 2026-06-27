import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { prisma } from '@/lib/prisma';
import { getSupabaseClient } from '@/lib/supabase';
import { parseImageFilename, imageIndexToField, invalidReason } from '@/lib/parseImageFilename';

type ProductRow = {
  id: string;
  code: string;
  gruppoMerceologico: string | null;
  sizeVariants: unknown;
  imageUrl: string | null;
  imageUrl2: string | null;
  imageUrl3: string | null;
  imageUrl4: string | null;
  imageUrl5: string | null;
};

function firstFreeSlot(p: ProductRow): number | null {
  for (let i = 1; i <= 5; i++) {
    const field = imageIndexToField(i);
    if (!p[field as keyof ProductRow]) return i;
  }
  return null;
}

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
    // Load ALL products so we can resolve MODA sizeVariant codes to their parent product
    const allProducts = await prisma.product.findMany({
      select: {
        id: true, code: true, gruppoMerceologico: true, sizeVariants: true,
        imageUrl: true, imageUrl2: true, imageUrl3: true, imageUrl4: true, imageUrl5: true,
      },
    });

    const productByCode = new Map<string, ProductRow>();
    const variantCodeToProduct = new Map<string, ProductRow>();

    for (const p of allProducts) {
      productByCode.set(p.code.toUpperCase(), p);
      if (
        p.gruppoMerceologico?.toUpperCase() === 'MODA' &&
        Array.isArray(p.sizeVariants)
      ) {
        for (const sv of p.sizeVariants as { taglia: string; codice: string }[]) {
          const cod = sv.codice?.trim();
          if (cod) variantCodeToProduct.set(cod.toUpperCase(), p);
        }
      }
    }

    const uniqueCodes = [...new Set(validEntries.map((e) => e.productCode))];
    const notFound: string[] = uniqueCodes.filter(
      (c) => !productByCode.has(c) && !variantCodeToProduct.has(c)
    );

    // ── Upload e aggiornamento per slot ───────────────────────────────────────
    const supabase = getSupabaseClient();
    let uploadedLinked = 0;
    let uploadedOrphan = 0;
    const errors: Array<{ file: string; message: string }> = [];

    for (const { file, productCode, imageIndex } of validEntries) {
      try {
        const buffer = Buffer.from(await file.arrayBuffer());
        const storagePath = `products/${file.name}`;

        const { error: uploadError } = await supabase.storage
          .from('products')
          .upload(storagePath, buffer, { contentType: file.type || 'image/jpeg', upsert: true });

        if (uploadError) throw new Error(uploadError.message);

        const { data: urlData } = supabase.storage.from('products').getPublicUrl(storagePath);
        const directProduct = productByCode.get(productCode);

        if (directProduct) {
          // Direct match: honour the _N slot from the filename
          const field = imageIndexToField(imageIndex);
          await prisma.product.update({
            where: { id: directProduct.id },
            data: { [field]: urlData.publicUrl },
          });
          (directProduct as any)[field] = urlData.publicUrl;
          uploadedLinked++;
        } else {
          // Try sizeVariant match (MODA): multiple taglia photos → first free slot on parent
          const variantProduct = variantCodeToProduct.get(productCode);
          if (variantProduct) {
            const slot = firstFreeSlot(variantProduct);
            if (slot !== null) {
              const field = imageIndexToField(slot);
              await prisma.product.update({
                where: { id: variantProduct.id },
                data: { [field]: urlData.publicUrl },
              });
              (variantProduct as any)[field] = urlData.publicUrl;
              uploadedLinked++;
            } else {
              // Parent product already has 5 images — upload only
              uploadedOrphan++;
            }
          } else {
            // No product found — visible as "da-collegare" in /admin/foto
            uploadedOrphan++;
          }
        }
      } catch (err: any) {
        errors.push({ file: file.name, message: err.message || 'Upload fallito' });
      }
    }

    const uploaded = uploadedLinked + uploadedOrphan;
    return NextResponse.json({
      uploaded,
      uploadedLinked,
      uploadedOrphan,
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
