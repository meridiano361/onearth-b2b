import { Metadata } from 'next';
import SurveyWizard from '@/components/survey/SurveyWizard';

export const metadata: Metadata = { title: 'Questionario — ON EARTH' };

export default function SurveyPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { token?: string };
}) {
  return (
    <div className="min-h-screen bg-[#faf8f5] flex flex-col">
      <SurveyWizard slug={params.slug} token={searchParams.token} />
    </div>
  );
}
