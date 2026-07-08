import { Metadata } from 'next';
import ModaVisualBigiotteria from '@/components/moda/ModaVisualBigiotteria';

export const metadata: Metadata = { title: 'Visual Bigiotteria' };

export default function VisualBigiotteriaPage() {
  return <ModaVisualBigiotteria />;
}
