import { Metadata } from 'next';
import { Suspense } from 'react';
import AdminProductsPage from '@/components/admin/AdminProductsPage';

export const metadata: Metadata = { title: 'Prodotti Casa — Admin' };

export default function ProductsCasaPage() {
  return <Suspense><AdminProductsPage lockedSection="casa" /></Suspense>;
}
