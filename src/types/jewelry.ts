// ─── Tipi dominio: Jewelry Display Rendering ─────────────────────────────────

export type TipoSupporto = 'busto_legno' | 'cono_legno' | 'portaorecchini' | 'portanelli' | 'parete_ganci' | 'espositore_onearth';
export type TonoLegno = 'chiaro' | 'scuro';
export type CategoriaGioiello = 'collana' | 'bracciale' | 'orecchino' | 'anello';
export type StatoCompositingJob = 'pending' | 'processing' | 'completed' | 'failed';

export const LABEL_SUPPORTO: Record<TipoSupporto, string> = {
  busto_legno:        'Busto in legno',
  cono_legno:         'Cono in legno',
  portaorecchini:     'Portaorecchini',
  portanelli:         'Portanelli',
  parete_ganci:       'Parete con ganci',
  espositore_onearth: 'Espositore On Earth',
};

export const LABEL_CATEGORIA: Record<CategoriaGioiello, string> = {
  collana:   'Collana',
  bracciale: 'Bracciale',
  orecchino: 'Orecchino',
  anello:    'Anello',
};

// Compatibilità supporto ↔ categoria
export const SUPPORTI_COMPATIBILI: Record<CategoriaGioiello, TipoSupporto[]> = {
  collana:   ['busto_legno',    'parete_ganci', 'espositore_onearth'],
  bracciale: ['cono_legno',     'parete_ganci', 'espositore_onearth'],
  orecchino: ['portaorecchini', 'parete_ganci', 'espositore_onearth'],
  anello:    ['portanelli',     'parete_ganci'],
};

export interface SupportoEspositivo {
  id: string;
  nome: string;
  tipo: TipoSupporto;
  tono: TonoLegno | null;
  immagineUrl: string;
  larghezzaPx: number;
  altezzaPx: number;
  attivo: boolean;
  createdAt: string;
  // Campi commerciali
  retailPrice: number | null;
  costPrice: number | null;
  misura: string | null;
  note: string | null;
  linkAcquisto: string | null;
  zone?: ZonaPosizionamento[];
}

// anchor_x / anchor_y: 0–1, rappresentano il CENTRO del gioiello nel compositing
export interface ZonaPosizionamento {
  id: string;
  supportoId: string;
  categoria: CategoriaGioiello;
  anchorX: number;
  anchorY: number;
  maxLarghezzaPx: number;
  maxAltezzaPx: number;
}

export interface CompositingJob {
  id: string;
  productId: string;
  productImageUrl: string;
  supportoId: string;
  categoria: CategoriaGioiello;
  stato: StatoCompositingJob;
  risultatoUrl: string | null;
  errore: string | null;
  createdAt: string;
  updatedAt: string;
  supporto?: SupportoEspositivo;
}

// ── Payload API ───────────────────────────────────────────────────────────────

export interface CompositeRequest {
  productId: string;
  productImageUrl: string;
  supportoId: string;
  categoria: CategoriaGioiello;
}

export interface CompositeResponse {
  jobId: string;
  stato: StatoCompositingJob;
  risultatoUrl: string | null;
  errore: string | null;
}

export interface CreateSupportoRequest {
  nome: string;
  tipo: TipoSupporto;
  tono?: TonoLegno;
  larghezzaPx?: number;
  altezzaPx?: number;
}

export interface UpsertZoneRequest {
  zone: Array<{
    categoria: CategoriaGioiello;
    anchorX: number;
    anchorY: number;
    maxLarghezzaPx: number;
    maxAltezzaPx: number;
  }>;
}
