'use client';

import { useSession } from 'next-auth/react';

export function useFeatureFlags() {
  const { data: session } = useSession();
  return {
    mondiEspositivi: session?.user?.featureMondiEspositivi === true,
  };
}
