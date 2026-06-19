import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getSupabaseClient } from '@/lib/supabase';
import { parseImageFilename, imageIndexToField } from '@/lib/parseImageFilename';

const BUCKET = 'products';
const ALLOWED = new Set(['ADMIN', 'SUPER_ADMIN']);
const IMAGE_EXTS = /\.(jpe?g|png|webp|gif|avif|heic|heif)$/i;

// POST /api/admin/foto/collega-tutti
// Scans the bucket and links all unlinked photos whose filename matches a product code.
// Skips photos already linked and skips slots already occupied.

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

  // Load all products with all image slots
  const products = await prisma.product.findMany({
    select: {
      id: true, code: true,
      imageUrl: true, imageUrl2: true, imageUrl3: true, imageUrl4: true, imageUrl5: true,
    },
  });

  // Build lookup structures
  const linkedUrls = new Set<string>();
  const codeToProduct = new Map<string, typeof products[0]>();
  for (const p of products) {
    codeToProduct.set(p.code.toUpperCase(), p);
    if (p.imageUrl) linkedUrls.add(p.imageUrl);
    if (p.imageUrl2) linkedUrls.add(p.imageUrl2);
    if (p.imageUrl3) linkedUrls.add(p.imageUrl3);
    if (p.imageUrl4) linkedUrls.add(p.imageUrl4);
    if (p.imageUrl5) linkedUrls.add(p.imageUrl5);
  }

  let linked = 0;
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

    const product = codeToProduct.get(parsed.productCode);
    if (!product) {
      notFound++;
      continue;
    }

    const field = imageIndexToField(parsed.imageIndex);
    if (product[field]) {
      slotTaken++;
      continue;
    }

    await prisma.product.update({
      where: { id: product.id },
      data: { [field]: publicUrl },
    });
    product[field] = publicUrl;
    linkedUrls.add(publicUrl);
    linked++;
  }

  return NextResponse.json({ linked, alreadyLinked, notFound, slotTaken });
}
