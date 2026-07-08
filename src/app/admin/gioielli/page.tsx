import { Metadata } from 'next';
import AdminJewelryPage from '@/components/admin/AdminJewelryPage';

export const metadata: Metadata = { title: 'Supporti Espositivi Gioielli' };

export default function GioielliPage() {
  return <AdminJewelryPage />;
}
