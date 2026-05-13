import { Metadata } from 'next';
import CatalogView from '@/components/catalog/CatalogView';

export const metadata: Metadata = {
  title: 'Catalog — CASA 2027',
};

export default function CatalogPage() {
  return <CatalogView />;
}
