export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'COMMERCIALE' | 'MAGAZZINO' | 'CUSTOMER';
export type AppRole = Role | 'OPERATOR';
export type DestinazioneTipo = 'BOTTEGA' | 'EMPORIO' | 'DISTRETTO' | 'STORE' | 'OUTLET' | 'TENDONE' | 'FIERA' | 'ONLINE' | 'ALTRO';
/** @deprecated use DestinazioneTipo */
export type CanaleTipo = DestinazioneTipo;

export type OrderStatus =
  | 'MERCE_DA_ORDINARE'
  | 'MERCE_ORDINATA'
  | 'MERCE_PARZIALMENTE_PRONTA'
  | 'MERCE_PRONTA_DA_AVVISARE'
  | 'MERCE_PRONTA_AVVISATO'
  | 'ESPORTATO'
  | 'ANNULLATO';

export interface Collection {
  id: string;
  name: string;
  slug: string;
  season: string;
  year: number;
  isActive: boolean;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  order: number;
  collectionId: string | null;
  children?: Category[];
}

export interface Product {
  id: string;
  code: string;
  name: string;
  description: string | null;
  costPrice: number;
  retailPrice: number;
  lotSize: number;
  imageUrl: string | null;
  notes: string | null;
  categoryId: string | null;
  collectionId: string | null;
  isActive: boolean;
  stock: number | null;
  famiglia: string | null;
  sottofamiglia: string | null;
  colore: string | null;
  nomLinea: string | null;
  misura: string | null;
  produttore: string | null;
  gruppoMerceologico: string | null;
  classe: string | null;
  sottoclasse: string | null;
  gruppoOmogeneo: string | null;
  stagione: string | null;
  temaColore: string | null;
  fasciaRicarico: string | null;
  fasciaSconto: number | null;
  collezione: string | null;
  tranche: string | null;
  iva: number;
  createdAt: string;
  category?: Category | null;
}

export interface ClassificazioneValore {
  id: string;
  tipo: string;
  nome: string;
  createdAt: string;
}

export interface Customer {
  id: string;
  companyName: string;
  customerCode: string;
  email: string;
  isActive: boolean;
  role: Role;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  vatNumber: string | null;
  createdAt: string;
}

// ─── New client hierarchy ─────────────────────────────────────────────────────

export interface Organization {
  id: string;
  nome: string;
  createdAt: string;
  _count?: { operatori: number; canali: number; ordini: number };
  operatori?: Operator[];
  destinazioni?: Destinazione[];
}

export interface Operator {
  id: string;
  nome: string;
  cognome: string;
  email: string;
  telefono: string | null;
  organizationId: string;
  attivo: boolean;
  createdAt: string;
  organization?: { nome: string };
}

export interface Destinazione {
  id: string;
  nome: string;
  tipo: DestinazioneTipo;
  citta: string | null;
  indirizzo: string | null;
  budget: number | null;
  organizationId: string;
  createdAt: string;
  organization?: { nome: string };
  _count?: { ordini: number };
}
/** @deprecated use Destinazione */
export type Canale = Destinazione;

// ─── Orders ───────────────────────────────────────────────────────────────────

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  mercePronta: number;
  unitPrice: number;
  subtotal: number;
  product?: Product;
}

export interface Order {
  id: string;
  customerId: string | null;
  organizationId: string | null;
  canaleId: string | null;
  operatorId: string | null;
  collectionId: string | null;
  status: OrderStatus;
  totalValue: number;
  totalItems: number;
  notes: string | null;
  createdAt: string;
  confirmedAt: string | null;
  customer?: Customer;
  organization?: Organization;
  destinazione?: Destinazione;
  /** @deprecated use destinazione */
  canale?: Destinazione;
  items?: OrderItem[];
}

// ─── Cart ─────────────────────────────────────────────────────────────────────

export interface CartItem {
  productId: string;
  product: Product;
  quantity: number;
}

export interface CartState {
  items: CartItem[];
  customerId: string | null;
  collectionId: string | null;
  notes: string;
}

// ─── API response types ───────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ─── Import types ─────────────────────────────────────────────────────────────

export interface ImportRow {
  code: string;
  name: string;
  description?: string;
  category?: string;
  costPrice: number;
  retailPrice: number;
  lotSize?: number;
  notes?: string;
  imageUrl?: string;
}

export interface ImportResult {
  success: number;
  errors: Array<{ row: number; message: string; data?: ImportRow }>;
  total: number;
}

// ─── Session extensions ───────────────────────────────────────────────────────

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      role: AppRole;
      companyName: string;
      customerCode: string;
      // Operator-specific fields
      organizationId?: string;
      destinazioneId?: string;
      destinazioneName?: string;
    };
  }

  interface User {
    id: string;
    email: string;
    role: AppRole;
    companyName: string;
    customerCode: string;
    isActive?: boolean;
    organizationId?: string;
    destinazioneId?: string;
    destinazioneName?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: AppRole;
    companyName: string;
    customerCode: string;
    organizationId?: string;
    destinazioneId?: string;
    destinazioneName?: string;
  }
}
