import { Metadata } from 'next';
import AdminOrganizzazioniPage from '@/components/admin/AdminOrganizzazioniPage';

export const metadata: Metadata = { title: 'Clienti — Admin ON EARTH' };

export default function CustomersPage() {
  return <AdminOrganizzazioniPage />;
}
