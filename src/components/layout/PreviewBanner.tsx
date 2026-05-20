'use client';

import { useRouter } from 'next/navigation';
import { Eye, X } from 'lucide-react';

interface Props {
  orgName: string;
  operatorName: string;
}

export default function PreviewBanner({ orgName, operatorName }: Props) {
  const router = useRouter();

  async function exitPreview() {
    await fetch('/api/admin/preview', { method: 'DELETE' });
    router.push('/admin');
    router.refresh();
  }

  return (
    <div className="w-full bg-amber-400 text-amber-900 px-4 py-2 flex items-center justify-between gap-3 z-50 flex-shrink-0 text-xs font-medium">
      <div className="flex items-center gap-2 min-w-0">
        <Eye size={14} className="flex-shrink-0" />
        <span className="truncate">
          Modalità Anteprima — stai vedendo l&apos;app come{' '}
          <strong>{orgName}</strong> · <strong>{operatorName}</strong>
        </span>
      </div>
      <button
        onClick={exitPreview}
        className="flex items-center gap-1 whitespace-nowrap hover:opacity-70 transition-opacity flex-shrink-0"
      >
        <X size={13} />
        Esci dalla modalità anteprima
      </button>
    </div>
  );
}
