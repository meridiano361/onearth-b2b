import { getSupabaseClient } from '@/lib/supabase';

const BUCKET_STANDS    = 'jewelry-stands';
const BUCKET_COMPOSITE = 'jewelry-composite';

// Scarica un'immagine da URL esterno e la restituisce come Buffer
export async function fetchImageBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Impossibile scaricare immagine: ${url} (${res.status})`);
  return Buffer.from(await res.arrayBuffer());
}

// Carica l'immagine di sfondo di un supporto nel bucket jewelry-stands
// Restituisce l'URL pubblico
export async function uploadStandImage(
  supportoId: string,
  fileBuffer: Buffer,
  mimeType: string,
): Promise<string> {
  const ext = mimeType.includes('png') ? 'png' : 'jpg';
  const path = `${supportoId}/background.${ext}`;
  const supabase = getSupabaseClient();

  const { error } = await supabase.storage
    .from(BUCKET_STANDS)
    .upload(path, fileBuffer, { contentType: mimeType, upsert: true });

  if (error) throw new Error(`Upload supporto fallito: ${error.message}`);

  const { data } = supabase.storage.from(BUCKET_STANDS).getPublicUrl(path);
  return data.publicUrl;
}

// Salva il JPEG composito e restituisce l'URL pubblico
export async function uploadCompositeResult(
  productId: string,
  supportoId: string,
  jpegBuffer: Buffer,
): Promise<string> {
  const ts = Date.now();
  const path = `${productId}/${supportoId}/${ts}.jpg`;
  const supabase = getSupabaseClient();

  const { error } = await supabase.storage
    .from(BUCKET_COMPOSITE)
    .upload(path, jpegBuffer, { contentType: 'image/jpeg', upsert: false });

  if (error) throw new Error(`Upload compositing fallito: ${error.message}`);

  const { data } = supabase.storage.from(BUCKET_COMPOSITE).getPublicUrl(path);
  return data.publicUrl;
}
