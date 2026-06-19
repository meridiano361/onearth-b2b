import { Metadata } from 'next';
import AdminSondaggiDestinatariPage from '@/components/admin/AdminSondaggiDestinatariPage';

export const metadata: Metadata = { title: 'Destinatari sondaggio — Admin' };

export default function SondaggioDestinatariPage({ params }: { params: { id: string } }) {
  return <AdminSondaggiDestinatariPage surveyId={params.id} />;
}
