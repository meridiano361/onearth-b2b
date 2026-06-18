import { Metadata } from 'next';
import AdminRecensioniRispostePage from '@/components/admin/AdminRecensioniRispostePage';

export const metadata: Metadata = { title: 'Risposte Survey — Admin' };

export default function RispostePage() {
  return <AdminRecensioniRispostePage />;
}
