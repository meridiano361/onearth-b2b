import { Metadata } from 'next';
import OrderPreviewView from '@/components/orders/OrderPreviewView';

export const metadata: Metadata = { title: 'Modifica Anteprima Moda — ON EARTH B2B' };

export default function ModaOrderPreviewPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { tab?: string };
}) {
  return <OrderPreviewView id={params.id} initialTab={searchParams.tab} />;
}
