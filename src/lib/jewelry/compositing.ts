import sharp from 'sharp';
import type { SupportoEspositivo, ZonaPosizionamento } from '@/types/jewelry';
import { calcPosition } from './positioning';
import { fetchImageBuffer, uploadCompositeResult } from './storage';

/**
 * Rimozione sfondo automatica via BFS flood fill dagli edge dell'immagine.
 * Funziona per sfondi bianchi o uniformi (fotografie prodotto standard).
 * Restituisce un PNG con sfondo trasparente.
 */
async function removeBackground(imageBuf: Buffer, threshold = 40): Promise<Buffer> {
  const { data, info } = await sharp(imageBuf)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height } = info;
  const px = new Uint8Array(data);
  const thresh2 = threshold * threshold;

  function rgb(x: number, y: number) {
    const i = (y * width + x) * 4;
    return [px[i], px[i + 1], px[i + 2]] as const;
  }

  // Colore di sfondo = media dei 4 angoli
  const corners = [rgb(0, 0), rgb(width - 1, 0), rgb(0, height - 1), rgb(width - 1, height - 1)];
  const bgR = Math.round(corners.reduce((s, c) => s + c[0], 0) / 4);
  const bgG = Math.round(corners.reduce((s, c) => s + c[1], 0) / 4);
  const bgB = Math.round(corners.reduce((s, c) => s + c[2], 0) / 4);

  function nearBg(x: number, y: number): boolean {
    const [r, g, b] = rgb(x, y);
    return (r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2 < thresh2;
  }

  // BFS: espande solo attraverso pixel vicini al colore di sfondo, a partire dagli edge
  const state = new Uint8Array(width * height); // 0=unseen 1=bg 2=fg
  const queue: number[] = [];
  let head = 0;

  function tryAdd(x: number, y: number) {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const idx = y * width + x;
    if (state[idx]) return;
    if (nearBg(x, y)) { state[idx] = 1; queue.push(idx); }
    else               { state[idx] = 2; }
  }

  for (let x = 0; x < width; x++)      { tryAdd(x, 0); tryAdd(x, height - 1); }
  for (let y = 1; y < height - 1; y++) { tryAdd(0, y); tryAdd(width - 1, y); }

  while (head < queue.length) {
    const idx = queue[head++];
    const x = idx % width;
    const y = (idx / width) | 0;
    tryAdd(x + 1, y); tryAdd(x - 1, y); tryAdd(x, y + 1); tryAdd(x, y - 1);
  }

  // Pixel di sfondo → alpha 0; pixel di bordo (fg con vicini bg) → sfumatura
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const i   = idx * 4;
      if (state[idx] === 1) {
        px[i + 3] = 0;
      } else if (state[idx] === 2) {
        // Se almeno un vicino è bg, sfuma l'alpha proporzionalmente alla distanza dal colore di sfondo
        const hasBgNeighbor =
          (x > 0          && state[idx - 1] === 1) ||
          (x < width - 1  && state[idx + 1] === 1) ||
          (y > 0          && state[idx - width] === 1) ||
          (y < height - 1 && state[idx + width] === 1);
        if (hasBgNeighbor) {
          const [r, g, b] = rgb(x, y);
          const dist = Math.sqrt((r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2);
          px[i + 3] = Math.round(Math.min(1, dist / threshold) * 255);
        }
      }
    }
  }

  return sharp(Buffer.from(px), { raw: { width, height, channels: 4 } }).png().toBuffer();
}

export interface CompositingInput {
  productId: string;
  productImageUrl: string;
  supporto: SupportoEspositivo;
  zona: ZonaPosizionamento;
}

export interface CompositingOutput {
  risultatoUrl: string;
}

export async function runCompositing(input: CompositingInput): Promise<CompositingOutput> {
  const { productId, productImageUrl, supporto, zona } = input;

  // 1. Scarica le due immagini in parallelo
  const [standBuf, jewelryBuf] = await Promise.all([
    fetchImageBuffer(supporto.immagineUrl),
    fetchImageBuffer(productImageUrl),
  ]);

  // 2. Rimuovi sfondo dalla foto del gioiello (flood fill dagli edge)
  const jewelryNoBg = await removeBackground(jewelryBuf);

  // 3. Metadati del gioiello per calcolare le dimensioni finali
  const { width: srcW = 800, height: srcH = 600 } = await sharp(jewelryNoBg).metadata();

  // 4. Calcola posizione e dimensione target nella foto composita
  const pos = calcPosition(zona, supporto.larghezzaPx, supporto.altezzaPx, srcW, srcH);

  // 5. Ridimensiona il gioiello mantenendo la trasparenza (PNG)
  const jewelryResized = await sharp(jewelryNoBg)
    .resize(pos.jewelryWidth, pos.jewelryHeight, { fit: 'inside', withoutEnlargement: true })
    .png()
    .toBuffer();

  // 6. Ridimensiona il supporto alle dimensioni canoniche e compone
  const composite = await sharp(standBuf)
    .resize(supporto.larghezzaPx, supporto.altezzaPx, { fit: 'fill' })
    .composite([{
      input:  jewelryResized,
      left:   pos.left,
      top:    pos.top,
      blend:  'over',       // rispetta l'alpha del PNG del gioiello
    }])
    .jpeg({ quality: 92, mozjpeg: true })
    .toBuffer();

  // 7. Salva su Supabase Storage e restituisce URL
  const risultatoUrl = await uploadCompositeResult(productId, supporto.id, composite);
  return { risultatoUrl };
}
