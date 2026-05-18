import { Metadata } from 'next';
import CustomerOrdersView from '@/components/orders/CustomerOrdersView';

export const metadata: Metadata = { title: 'I miei Ordini — ON EARTH B2B' };

export default function OrdersPage() {
  return <CustomerOrdersView />;
}
