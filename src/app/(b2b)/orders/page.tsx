import { Metadata } from 'next';
import OrdersView from '@/components/orders/OrdersView';

export const metadata: Metadata = {
  title: 'My Orders',
};

export default function OrdersPage() {
  return <OrdersView />;
}
