import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getSupabaseClient } from '@/lib/supabase';
import { parseImageFilename, imageIndexToField } from '@/lib/parseImageFilename';

const BUCKET = 'products';
const ALLOWED = new Set(['ADMIN', 'SUPER_ADMIN']);
const IMAGE_EXTS = /\.(jpe?g|png|webp|gif|avif|heic|heif)$/i;

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

// POST /api/admin/foto/collega-tutti
// Scans the bucket and links all unlinked photos whose filename matches:
//   1. A product code directly (existing behaviour)
//   2. Any sizeVariant codice of a MODA product (new)
// For direct matches: uses the parsed slot; skips if already taken.
// For sizeVariant matches: uses the next free slot so multiple taglia photos
//   can all land on the same parent product.

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !ALLOWED.has(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const supabase = getSupabaseClient();

  const [rootRes, subRes] = await Promise.all([
    supabase.storage.from(BUCKET).list('', { limit: 1000 }),
    supabase.storage.from(BUCKET).list('products', { limit: 1000 }),
  ]);

  const allFiles = [
    ...(rootRes.data ?? [])
      .filter((f) => f.id !== null && IMAGE_EXTS.test(f.name))
      .map((f) => ({ path: f.name, name: f.name })),
    ...(subRes.data ?? [])
      .filter((f) => f.id !== null && IMAGE_EXTS.test(f.name))
      .map((f) => ({ path: `products/${f.name}`, name: f.name })),
  ];

  // Load ALL products — needed for both code and sizeVariant lookup
  const products = await prisma.product.findMany({
    select: {
      id: true, code: true, gruppoMerceologico: true, sizeVariants: true,
      imageUrl: true, imageUrl2: true, imageUrl3: true, imageUrl4: true, imageUrl5: true,
    },
  });

  const linkedUrls = new Set<string>();
  const codeToProduct = new Map<string, ProductRow>();
  // Maps each sizeVariant codice → the parent MODA product
  const variantCodeToProduct = new Map<string, ProductRow>();

  for (const p of products) {
    codeToProduct.set(p.code.toUpperCase(), p);
    if (p.imageUrl)  linkedUrls.add(p.imageUrl);
    if (p.imageUrl2) linkedUrls.add(p.imageUrl2);
    if (p.imageUrl3) linkedUrls.add(p.imageUrl3);
    if (p.imageUrl4) linkedUrls.add(p.imageUrl4);
    if (p.imageUrl5) linkedUrls.add(p.imageUrl5);

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

  let linked = 0;
  let linkedByVariant = 0;
  let alreadyLinked = 0;
  let notFound = 0;
  let slotTaken = 0;

  for (const { path, name } of allFiles) {
    const parsed = parseImageFilename(name);
    if (!parsed.valid) continue;

    const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path);

    if (linkedUrls.has(publicUrl)) {
      alreadyLinked++;
      continue;
    }

    const directProduct = codeToProduct.get(parsed.productCode);
    const variantProduct = directProduct
      ? undefined
      : variantCodeToProduct.get(parsed.productCode);

    if (!directProduct && !variantProduct) {
      notFound++;
      continue;
    }

    // For both direct and sizeVariant matches, use the first free slot.
    // The _N suffix in the filename is a relative ordering hint among multiple
    // photos of the same product, not an absolute slot number — so a lone
    // 123_2.jpg should land on slot 1 rather than leaving slot 1 empty.
    const targetProduct = directProduct ?? variantProduct!;
    const slot = firstFreeSlot(targetProduct);
    if (slot === null) {
      slotTaken++;
      continue;
    }
    const field = imageIndexToField(slot);
    await prisma.product.update({
      where: { id: targetProduct.id },
      data: { [field]: publicUrl },
    });
    (targetProduct as any)[field] = publicUrl;
    linkedUrls.add(publicUrl);
    linked++;
    if (variantProduct) linkedByVariant++;
  }

  return NextResponse.json({ linked, linkedByVariant, alreadyLinked, notFound, slotTaken });
}
