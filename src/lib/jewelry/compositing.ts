// Presupposto MVP: l'immagine del gioiello è un PNG con sfondo trasparente.
// Senza trasparenza il compositing funziona ma lo sfondo del gioiello coprirà
// il supporto. Rimozione sfondo automatica (V2) da aggiungere qui.

import sharp from 'sharp';
import type { SupportoEspositivo, ZonaPosizionamento } from '@/types/jewelry';
import { calcPosition } from './positioning';
import { fetchImageBuffer, uploadCompositeResult } from './storage';

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

  // 2. Metadati del gioiello per calcolare le dimensioni finali
  const { width: srcW = 800, height: srcH = 600 } = await sharp(jewelryBuf).metadata();

  // 3. Calcola posizione e dimensione target nella foto composita
  const pos = calcPosition(zona, supporto.larghezzaPx, supporto.altezzaPx, srcW, srcH);

  // 4. Ridimensiona il gioiello mantenendo la trasparenza (PNG)
  const jewelryResized = await sharp(jewelryBuf)
    .resize(pos.jewelryWidth, pos.jewelryHeight, { fit: 'inside', withoutEnlargement: true })
    .png()
    .toBuffer();

  // 5. Ridimensiona il supporto alle dimensioni canoniche e compone
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

  // 6. Salva su Supabase Storage e restituisce URL
  const risultatoUrl = await uploadCompositeResult(productId, supporto.id, composite);
  return { risultatoUrl };
}
