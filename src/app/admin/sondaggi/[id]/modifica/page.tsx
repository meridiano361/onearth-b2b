import AdminSondaggiModificaPage from '@/components/admin/AdminSondaggiModificaPage';

export default function SondaggioModificaPage({ params }: { params: { id: string } }) {
  return <AdminSondaggiModificaPage surveyId={params.id} />;
}
