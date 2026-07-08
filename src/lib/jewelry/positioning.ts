import type { ZonaPosizionamento } from '@/types/jewelry';

export interface JewelryDimensions {
  width: number;
  height: number;
}

export interface CompositePosition {
  left: number;  // pixel, da bordo sinistro del supporto
  top: number;   // pixel, da bordo superiore del supporto
  jewelryWidth: number;
  jewelryHeight: number;
}

// Ridimensiona mantenendo l'aspect ratio; non ingrandisce oltre la dimensione originale.
export function fitInside(
  srcW: number, srcH: number,
  maxW: number, maxH: number,
): JewelryDimensions {
  const ratio = Math.min(maxW / srcW, maxH / srcH, 1);
  return { width: Math.round(srcW * ratio), height: Math.round(srcH * ratio) };
}

// Calcola la posizione top-left del gioiello nell'immagine composita.
// anchor_x / anchor_y = dove cade il CENTRO del gioiello nel supporto (coord 0–1).
export function calcPosition(
  zona: Pick<ZonaPosizionamento, 'anchorX' | 'anchorY' | 'maxLarghezzaPx' | 'maxAltezzaPx'>,
  standW: number,
  standH: number,
  srcW: number,
  srcH: number,
): CompositePosition {
  const { width: jw, height: jh } = fitInside(srcW, srcH, zona.maxLarghezzaPx, zona.maxAltezzaPx);

  const left = Math.round(standW * zona.anchorX - jw / 2);
  const top  = Math.round(standH * zona.anchorY - jh / 2);

  // Clamp entro i bordi (nessun overflow nell'immagine composita)
  return {
    left:         Math.max(0, Math.min(left, standW - jw)),
    top:          Math.max(0, Math.min(top,  standH - jh)),
    jewelryWidth:  jw,
    jewelryHeight: jh,
  };
}
