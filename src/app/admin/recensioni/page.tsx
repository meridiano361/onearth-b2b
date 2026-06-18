import { Metadata } from 'next';
import AdminRecensioniPage from '@/components/admin/AdminRecensioniPage';

export const metadata: Metadata = { title: 'Recensioni — Admin' };

export default function RecensioniPage() {
  return <AdminRecensioniPage />;
}
