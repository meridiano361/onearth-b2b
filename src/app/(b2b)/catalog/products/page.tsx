import { Suspense } from 'react';
import { Metadata } from 'next';
import CatalogView from '@/components/catalog/CatalogView';

export const metadata: Metadata = {
  title: 'Catalogo — CASA 2027',
};

export default function ProductsPage() {
  return (
    <Suspense fallback={null}>
      <CatalogView excludeGruppoMerceologico="Moda" />
    </Suspense>
  );
}
