import { Metadata } from 'next';
import AdminCategoriesPage from '@/components/admin/AdminCategoriesPage';

export const metadata: Metadata = { title: 'Categories — Admin' };

export default function CategoriesPage() {
  return <AdminCategoriesPage />;
}
