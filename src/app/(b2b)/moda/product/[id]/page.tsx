import { Metadata } from 'next';
import ProductDetailView from '@/components/catalog/ProductDetailView';

export const metadata: Metadata = { title: 'Prodotto Moda — ON EARTH B2B' };

export default function ModaProductDetailPage({ params }: { params: { id: string } }) {
  return <ProductDetailView id={params.id} />;
}
