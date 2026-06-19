import { Metadata } from 'next';
import AdminSondaggiListPage from '@/components/admin/AdminSondaggiListPage';

export const metadata: Metadata = { title: 'Sondaggi — Admin' };

export default function SondaggiPage() {
  return <AdminSondaggiListPage />;
}
