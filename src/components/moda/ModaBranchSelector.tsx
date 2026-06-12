'use client';

import Link from 'next/link';
import { Home, Sparkles } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { hasMultipleBranches, getVisibleBranches } from '@/lib/catalogBranches';

const ICON_MAP = {
  home: Home,
  sparkles: Sparkles,
} as const;

/**
 * Collection branch selector — renders ONLY when the logged-in user can see multiple branches.
 * For all other users this component returns null with zero side effects.
 */
export default function ModaBranchSelector({ activeBranchId }: { activeBranchId: 'casa27' | 'modaPE27' }) {
  const { data: session } = useSession();
  const email = session?.user?.email ?? null;

  if (!hasMultipleBranches(email)) return null;

  const branches = getVisibleBranches(email);

  return (
    <section className="flex gap-3">
      {branches.map((branch) => {
        const Icon = ICON_MAP[branch.iconName];
        const isActive = branch.id === activeBranchId;

        if (isActive) {
          return (
            <div
              key={branch.id}
              className="flex-1 flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 border-primary bg-primary text-white cursor-default"
            >
              <Icon size={16} className="flex-shrink-0 opacity-80" />
              <div className="min-w-0">
                <p className="text-xs font-semibold leading-none">{branch.label}</p>
                <p className="text-2xs opacity-60 mt-0.5">In corso</p>
              </div>
            </div>
          );
        }

        return (
          <Link
            key={branch.id}
            href={branch.rootRoute}
            className="flex-1 flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 border-border bg-white hover:border-primary/50 transition-colors group"
          >
            <Icon size={16} className="flex-shrink-0 text-gray-400 group-hover:text-primary transition-colors" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-primary leading-none">{branch.label}</p>
              <p className="text-2xs text-gray-400 mt-0.5">{branch.description}</p>
            </div>
          </Link>
        );
      })}
    </section>
  );
}
