'use client';

import { LayoutGrid, List, Columns } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ViewMode } from '@/hooks/useViewMode';

const MODES: { mode: ViewMode; icon: React.ReactNode; title: string; tooltip: string }[] = [
  { mode: 'grid',     icon: <LayoutGrid size={14} />, title: 'Griglia',   tooltip: 'Vista a griglia' },
  { mode: 'list',     icon: <List size={14} />,       title: 'Lista',     tooltip: 'Vista a lista compatta' },
  { mode: 'lookbook', icon: <Columns size={14} />,    title: 'Lookbook',  tooltip: 'Vista lookbook con foto grandi' },
];

export function ViewToggle({
  mode,
  onChange,
}: {
  mode: ViewMode;
  onChange: (m: ViewMode) => void;
}) {
  return (
    <div className="flex items-center border border-border rounded overflow-hidden flex-shrink-0">
      {MODES.map(({ mode: m, icon, title, tooltip }) => (
        <button
          key={m}
          title={title}
          data-tooltip={tooltip}
          onClick={() => onChange(m)}
          className={cn(
            'p-2 transition-colors',
            mode === m
              ? 'bg-primary text-white'
              : 'text-gray-400 hover:text-primary hover:bg-cream'
          )}
        >
          {icon}
        </button>
      ))}
    </div>
  );
}
