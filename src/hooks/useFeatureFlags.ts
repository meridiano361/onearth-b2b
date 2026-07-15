'use client';

import { useSession } from 'next-auth/react';
import { isAdminRole } from '@/lib/roles';

export function useFeatureFlags() {
  const { data: session } = useSession();
  const role = session?.user?.role;
  // Admins always have access; operators get it from the JWT-stored org check
  const canVisual = isAdminRole(role) || (session?.user?.canAccessVisual ?? false);
  return {
    mondiEspositivi: canVisual,
    canAccessFullModa: canVisual,
  };
}
