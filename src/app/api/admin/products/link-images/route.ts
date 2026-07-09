import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { prisma } from '@/lib/prisma';
import { getSupabaseClient } from '@/lib/supabase';
import { parseImageFilename, imageIndexToField } from '@/lib/parseImageFilename';

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

    const { paths } = (await req.json()) as { paths: { filename: string; path: string }[] };
    if (!paths?.length) {
      return NextResponse.json({ error: 'Nessun path' }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    // ── Lookup prodotti ───────────────────────────────────────────────────────
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

    // ── Aggiorna DB e calcola statistiche ─────────────────────────────────────
    let uploadedLinked = 0;
    let uploadedOrphan = 0;
    const notFoundSet = new Set<string>();
    const errors: Array<{ file: string; message: string }> = [];

    for (const { filename, path } of paths) {
      try {
        const parsed = parseImageFilename(filename);
        if (!parsed.valid) continue;

        const { productCode, imageIndex } = parsed;
        const { data: urlData } = supabase.storage.from('products').getPublicUrl(path);
        const directProduct = productByCode.get(productCode.toUpperCase());

        if (directProduct) {
          const field = imageIndexToField(imageIndex);
          await prisma.product.update({
            where: { id: directProduct.id },
            data: { [field]: urlData.publicUrl },
          });
          (directProduct as any)[field] = urlData.publicUrl;
          uploadedLinked++;
        } else {
          const variantProduct = variantCodeToProduct.get(productCode.toUpperCase());
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
              uploadedOrphan++;
            }
          } else {
            notFoundSet.add(productCode);
            uploadedOrphan++;
          }
        }
      } catch (err: any) {
        errors.push({ file: filename, message: err.message || 'Errore DB' });
      }
    }

    return NextResponse.json({
      uploaded: uploadedLinked + uploadedOrphan,
      uploadedLinked,
      uploadedOrphan,
      notFound: [...notFoundSet],
      errors,
      nonConforming: [],
      total: paths.length,
    });
  } catch (err: any) {
    console.error('link-images error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
