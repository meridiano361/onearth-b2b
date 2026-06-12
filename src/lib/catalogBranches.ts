/**
 * Catalog branch configuration.
 * Defines all catalog branches (Casa 27, Moda PE27…) with their visibility rules and metadata.
 * Add future branches here — components read from this config, not from hardcoded strings.
 */

import type { CatalogBranchId } from './modaAccess';
import { MODA_EMAIL, MODA_COLLEZIONE, MODA_BRANCH_ID, CASA_BRANCH_ID, canAccessModa } from './modaAccess';

export type CatalogBranch = {
  id: CatalogBranchId;
  label: string;
  description: string;
  season: string;
  rootRoute: string;
  collezione: string | null;
  iconName: 'home' | 'sparkles';
  /** Returns whether a given email is allowed to see this branch. */
  canAccess: (email: string | null | undefined) => boolean;
};

export const CATALOG_BRANCHES: CatalogBranch[] = [
  {
    id: CASA_BRANCH_ID,
    label: 'Casa 27',
    description: 'Collezione casa e arredo',
    season: 'Autunno / Inverno 2027',
    rootRoute: '/catalog',
    collezione: null,
    iconName: 'home',
    canAccess: () => true,
  },
  {
    id: MODA_BRANCH_ID,
    label: 'Moda PE27',
    description: 'Primavera / Estate 2027',
    season: 'Primavera / Estate 2027',
    rootRoute: '/moda',
    collezione: MODA_COLLEZIONE,
    iconName: 'sparkles',
    canAccess: canAccessModa,
  },
];

/** Returns branches visible to a given email. */
export function getVisibleBranches(email: string | null | undefined): CatalogBranch[] {
  return CATALOG_BRANCHES.filter((b) => b.canAccess(email));
}

/** True if a user can see more than one branch (i.e. the selector should be shown). */
export function hasMultipleBranches(email: string | null | undefined): boolean {
  return getVisibleBranches(email).length > 1;
}

export { MODA_EMAIL, canAccessModa };
