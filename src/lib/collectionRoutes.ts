/**
 * Collection-aware routing table.
 *
 * Each collection owns its URL namespace; components must use these helpers
 * instead of hardcoding paths so that adding a future collection requires
 * only a new entry in ROUTES_MAP.
 */

export interface CollectionRoutes {
  /** Matches the DB Collection.id field used in Order.collectionId */
  collectionId: string;
  catalog: string;
  product: (id: string) => string;
  carts: string;
  orders: string;
  orderPreview: (id: string, tab?: string) => string;
  preferiti: string;
}

const ROUTES_MAP: Record<string, CollectionRoutes> = {
  moda: {
    collectionId: 'moda',
    catalog: '/moda/catalogo',
    product: (id) => `/moda/product/${id}`,
    carts: '/moda/carrelli',
    orders: '/moda/ordini',
    orderPreview: (id, tab) => `/moda/ordini/${id}/preview${tab ? `?tab=${tab}` : ''}`,
    preferiti: '/moda/preferiti',
  },
  casa: {
    collectionId: 'casa',
    catalog: '/catalog/products',
    product: (id) => `/catalog/${id}`,
    carts: '/catalog/carts',
    orders: '/catalog/orders',
    orderPreview: (id, tab) => `/catalog/orders/${id}/preview${tab ? `?tab=${tab}` : ''}`,
    preferiti: '/catalog/preferiti',
  },
};

export const FALLBACK_ROUTES: CollectionRoutes = ROUTES_MAP.casa;

export function getBranchFromPathname(pathname: string): string {
  if (pathname.startsWith('/moda')) return 'moda';
  return 'casa';
}

export function getCollectionRoutes(branch: string): CollectionRoutes {
  return ROUTES_MAP[branch] ?? FALLBACK_ROUTES;
}
