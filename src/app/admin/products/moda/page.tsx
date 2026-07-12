import { Metadata } from 'next';
import { Suspense } from 'react';
import AdminProductsPage from '@/components/admin/AdminProductsPage';

export const metadata: Metadata = { title: 'Prodotti Moda — Admin' };

export default function ProductsModaPage() {
  return <Suspense><AdminProductsPage lockedSection="moda" /></Suspense>;
}
