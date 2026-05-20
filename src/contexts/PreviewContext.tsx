'use client';

import { createContext, useContext } from 'react';

export interface PreviewInfo {
  organizationId: string;
  operatorId: string;
  orgName: string;
  operatorName: string;
}

const PreviewContext = createContext<PreviewInfo | null>(null);

export function PreviewProvider({
  value,
  children,
}: {
  value: PreviewInfo | null;
  children: React.ReactNode;
}) {
  return <PreviewContext.Provider value={value}>{children}</PreviewContext.Provider>;
}

export function usePreview(): PreviewInfo | null {
  return useContext(PreviewContext);
}
