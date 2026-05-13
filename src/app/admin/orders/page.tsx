import { Metadata } from 'next';
import AdminOrdersPage from '@/components/admin/AdminOrdersPage';

export const metadata: Metadata = { title: 'Orders — Admin' };

export default function OrdersPage() {
  return <AdminOrdersPage />;
}
