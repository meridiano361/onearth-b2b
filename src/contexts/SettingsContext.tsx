'use client';

import { createContext, useContext } from 'react';
import type { AppSettingsData } from '@/lib/settingsHelpers';
import { DEFAULT_APP_SETTINGS } from '@/lib/settingsHelpers';

// Re-export for convenience
export type { AppSettingsData };
export { DEFAULT_APP_SETTINGS };
export { parseSettingsFromDb } from '@/lib/settingsHelpers';

const SettingsContext = createContext<AppSettingsData>(DEFAULT_APP_SETTINGS);

export function SettingsProvider({ value, children }: { value: AppSettingsData; children: React.ReactNode }) {
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): AppSettingsData {
  return useContext(SettingsContext);
}
