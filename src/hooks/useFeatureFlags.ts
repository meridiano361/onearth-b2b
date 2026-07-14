'use client';

import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';

interface UserFlags {
  canAccessVisual: boolean;
  canAccessFullModa: boolean;
}

export function useFeatureFlags() {
  const { data: session } = useSession();

  const { data: flags } = useQuery<UserFlags>({
    queryKey: ['user-flags', session?.user?.id],
    queryFn: () => fetch('/api/user/flags').then((r) => r.json()),
    enabled: !!session,
    staleTime: 5 * 60 * 1000,
  });

  return {
    mondiEspositivi: flags?.canAccessVisual ?? false,
    canAccessFullModa: flags?.canAccessFullModa ?? false,
  };
}
