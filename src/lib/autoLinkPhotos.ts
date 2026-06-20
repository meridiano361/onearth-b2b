import { prisma } from './prisma';
import { getSupabaseClient } from './supabase';
import { parseImageFilename, imageIndexToField } from './parseImageFilename';

const BUCKET = 'products';
const IMAGE_EXTS = /\.(jpe?g|png|webp|gif|avif|heic|heif)$/i;

/**
 * Scans the Supabase bucket for photos whose filename matches the given product code
 * and links them to empty image slots on the product.
 * Safe to call fire-and-forget — skips already-linked URLs and occupied slots.
 */
export async function autoLinkPhotosForProduct(productId: string, code: string): Promise<{ linked: number }> {
  const supabase = getSupabaseClient();
  const upperCode = code.toUpperCase();

  const [rootRes, subRes] = await Promise.all([
    supabase.storage.from(BUCKET).list('', { limit: 1000 }),
    supabase.storage.from(BUCKET).list('products', { limit: 1000 }),
  ]);

  const allFiles = [
    ...(rootRes.data ?? []).filter((f) => f.id !== null && IMAGE_EXTS.test(f.name)).map((f) => ({ path: f.name, name: f.name })),
    ...(subRes.data ?? []).filter((f) => f.id !== null && IMAGE_EXTS.test(f.name)).map((f) => ({ path: `products/${f.name}`, name: f.name })),
  ];

  // Only care about files that parse to this product's code
  const matching = allFiles.filter(({ name }) => {
    const p = parseImageFilename(name);
    return p.valid && p.productCode === upperCode;
  });

  if (matching.length === 0) return { linked: 0 };

  // Load current product slots
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { imageUrl: true, imageUrl2: true, imageUrl3: true, imageUrl4: true, imageUrl5: true },
  });
  if (!product) return { linked: 0 };

  // Build set of all URLs already assigned to any product (to avoid duplicates)
  const allProducts = await prisma.product.findMany({
    select: { imageUrl: true, imageUrl2: true, imageUrl3: true, imageUrl4: true, imageUrl5: true },
  });
  const linkedUrls = new Set<string>();
  for (const p of allProducts) {
    [p.imageUrl, p.imageUrl2, p.imageUrl3, p.imageUrl4, p.imageUrl5].forEach((u) => { if (u) linkedUrls.add(u); });
  }

  const updates: Record<string, string> = {};
  let linked = 0;

  for (const { path, name } of matching) {
    const parsed = parseImageFilename(name);
    if (!parsed.valid) continue;

    const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path);
    if (linkedUrls.has(publicUrl)) continue;

    const field = imageIndexToField(parsed.imageIndex);
    if (product[field] || updates[field]) continue; // slot occupied

    updates[field] = publicUrl;
    linkedUrls.add(publicUrl);
    linked++;
  }

  if (linked > 0) {
    await prisma.product.update({ where: { id: productId }, data: updates });
  }

  return { linked };
}
