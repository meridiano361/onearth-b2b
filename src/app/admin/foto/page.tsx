import { Metadata } from 'next';
import AdminFotoPage from '@/components/admin/AdminFotoPage';

export const metadata: Metadata = { title: 'Gestione foto — Admin' };

export default function FotoPage() {
  return <AdminFotoPage />;
}
