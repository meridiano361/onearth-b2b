import { Metadata } from 'next';
import AdminCustomersPage from '@/components/admin/AdminCustomersPage';

export const metadata: Metadata = { title: 'Customers — Admin' };

export default function CustomersPage() {
  return <AdminCustomersPage />;
}
