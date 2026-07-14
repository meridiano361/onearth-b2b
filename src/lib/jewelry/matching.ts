import type { CategoriaGioiello, TipoSupporto, ZonaPosizionamento } from '@/types/jewelry';
import { SUPPORTI_COMPATIBILI } from '@/types/jewelry';

export function isCompatibile(categoria: CategoriaGioiello, tipo: TipoSupporto): boolean {
  return SUPPORTI_COMPATIBILI[categoria].includes(tipo);
}

export function categorieSupportate(tipo: TipoSupporto): CategoriaGioiello[] {
  return (Object.keys(SUPPORTI_COMPATIBILI) as CategoriaGioiello[]).filter((cat) =>
    SUPPORTI_COMPATIBILI[cat].includes(tipo),
  );
}

// Zone default per ogni combinazione tipo+categoria.
// anchor_x / anchor_y = posizione CENTRO del gioiello, coordinate normalizzate 0–1.
// Questi valori sono punti di partenza — l'admin li affina per ogni supporto reale.
type ZoneDefaults = Record<
  TipoSupporto,
  Partial<Record<CategoriaGioiello, Omit<ZonaPosizionamento, 'id' | 'supportoId'>>>
>;

export const ZONE_DEFAULT: ZoneDefaults = {
  busto_legno: {
    collana: { categoria: 'collana', anchorX: 0.50, anchorY: 0.28, maxLarghezzaPx: 280, maxAltezzaPx: 160 },
  },
  cono_legno: {
    bracciale: { categoria: 'bracciale', anchorX: 0.50, anchorY: 0.38, maxLarghezzaPx: 200, maxAltezzaPx: 90 },
  },
  portanelli: {
    anello: { categoria: 'anello', anchorX: 0.50, anchorY: 0.35, maxLarghezzaPx: 110, maxAltezzaPx: 60 },
  },
  portaorecchini: {
    orecchino: { categoria: 'orecchino', anchorX: 0.50, anchorY: 0.28, maxLarghezzaPx: 160, maxAltezzaPx: 220 },
  },
  parete_ganci: {
    collana:   { categoria: 'collana',   anchorX: 0.50, anchorY: 0.32, maxLarghezzaPx: 260, maxAltezzaPx: 150 },
    bracciale: { categoria: 'bracciale', anchorX: 0.50, anchorY: 0.35, maxLarghezzaPx: 180, maxAltezzaPx: 80 },
    orecchino: { categoria: 'orecchino', anchorX: 0.50, anchorY: 0.30, maxLarghezzaPx: 140, maxAltezzaPx: 200 },
    anello:    { categoria: 'anello',    anchorX: 0.50, anchorY: 0.35, maxLarghezzaPx: 100, maxAltezzaPx: 55 },
  },
  espositore_onearth: {}, // nessuna zona di compositing — solo uso commerciale
};

export function getZoneDefault(
  tipo: TipoSupporto,
  categoria: CategoriaGioiello,
): Omit<ZonaPosizionamento, 'id' | 'supportoId'> | null {
  return ZONE_DEFAULT[tipo]?.[categoria] ?? null;
}

// Costruisce le zone default per un supporto appena creato
export function buildZoneDefault(
  supportoId: string,
  tipo: TipoSupporto,
): Array<Omit<ZonaPosizionamento, 'id'>> {
  const defaults = ZONE_DEFAULT[tipo] ?? {};
  return Object.values(defaults).map((z) => ({ ...z!, supportoId }));
}
