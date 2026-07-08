import { Metadata } from 'next';

export const metadata: Metadata = { title: 'Visual Bigiotteria' };

export default function VisualBigiotteriaPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      <p className="text-sm font-medium text-primary mb-1">Visual Bigiotteria</p>
      <p className="text-xs text-gray-400">Prossimamente disponibile.</p>
    </div>
  );
}
