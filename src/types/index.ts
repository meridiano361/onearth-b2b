export type Role = 'ADMIN' | 'CUSTOMER';
export type OrderStatus = 'DRAFT' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'CANCELLED';

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
  createdAt: string;
  category?: Category | null;
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

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  product?: Product;
}

export interface Order {
  id: string;
  customerId: string;
  collectionId: string | null;
  status: OrderStatus;
  totalValue: number;
  totalItems: number;
  notes: string | null;
  createdAt: string;
  confirmedAt: string | null;
  customer?: Customer;
  items?: OrderItem[];
}

// Cart types
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

// API response types
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

// Import types
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

// Session extension
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      role: Role;
      companyName: string;
      customerCode: string;
    };
  }

  interface User {
    id: string;
    email: string;
    role: Role;
    companyName: string;
    customerCode: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: Role;
    companyName: string;
    customerCode: string;
  }
}
