import { Metadata } from 'next';
import AdminSondaggiOverviewPage from '@/components/admin/AdminSondaggiOverviewPage';

export const metadata: Metadata = { title: 'Panoramica sondaggio — Admin' };

export default function SondaggioOverviewPage({ params }: { params: { id: string } }) {
  return <AdminSondaggiOverviewPage surveyId={params.id} />;
}
