'use client';

import { useState, useEffect } from 'react';

export type ViewMode = 'grid' | 'list' | 'lookbook';

const LS_KEY = 'catalog-view-mode';

export function useViewMode() {
  const [mode, setMode] = useState<ViewMode>('grid');

  useEffect(() => {
    const saved = localStorage.getItem(LS_KEY);
    if (saved === 'grid' || saved === 'list' || saved === 'lookbook') {
      setMode(saved as ViewMode);
    }
  }, []);

  function changeMode(m: ViewMode) {
    setMode(m);
    localStorage.setItem(LS_KEY, m);
  }

  return { mode, changeMode };
}
