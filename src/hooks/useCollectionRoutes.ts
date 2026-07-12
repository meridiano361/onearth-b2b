'use client';
import { usePathname } from 'next/navigation';
import { getBranchFromPathname, getCollectionRoutes, type CollectionRoutes } from '@/lib/collectionRoutes';

export function useCollectionRoutes(): CollectionRoutes {
  const pathname = usePathname();
  return getCollectionRoutes(getBranchFromPathname(pathname));
}
