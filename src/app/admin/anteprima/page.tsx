import { Metadata } from 'next';
import AdminAnteprimaPage from '@/components/admin/AdminAnteprimaPage';

export const metadata: Metadata = { title: 'Anteprima — Admin' };

export default function Anteprima() {
  return <AdminAnteprimaPage />;
}
