import { Metadata } from 'next';
import OrderPreviewView from '@/components/orders/OrderPreviewView';

export const metadata: Metadata = { title: 'Anteprima Ordine — ON EARTH B2B' };

export default function OrderPreviewPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { tab?: string };
}) {
  return <OrderPreviewView id={params.id} initialTab={searchParams.tab} />;
}
