import { Metadata } from 'next';
import AdminSondaggiRispostePage from '@/components/admin/AdminSondaggiRispostePage';

export const metadata: Metadata = { title: 'Risposte sondaggio — Admin' };

export default function SondaggioRispostePage({ params }: { params: { id: string } }) {
  return <AdminSondaggiRispostePage surveyId={params.id} />;
}
