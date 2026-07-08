import { Metadata } from 'next';
import AdminJewelryPage from '@/components/admin/AdminJewelryPage';

export const metadata: Metadata = { title: 'Visual Bigiotteria' };

export default function VisualBigiotteriPage() {
  return <AdminJewelryPage />;
}
