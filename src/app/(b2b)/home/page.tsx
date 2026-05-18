import { Metadata } from 'next';
import CustomerHome from '@/components/catalog/CustomerHome';

export const metadata: Metadata = { title: 'Home — ON EARTH B2B' };

export default function HomePage() {
  return <CustomerHome />;
}
