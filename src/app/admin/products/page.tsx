import { Metadata } from 'next';
import AdminProductsPage from '@/components/admin/AdminProductsPage';

export const metadata: Metadata = { title: 'Products — Admin' };

export default function ProductsPage() {
  return <AdminProductsPage />;
}
