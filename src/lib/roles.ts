export const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN', 'COMMERCIALE', 'MAGAZZINO'] as const;
export type AdminRole = typeof ADMIN_ROLES[number];
export type AppRole = AdminRole | 'CUSTOMER';

export function isAdminRole(role: string | undefined | null): boolean {
  return !!role && (ADMIN_ROLES as readonly string[]).includes(role);
}

// Which admin routes each role may visit (prefix match)
const ROLE_ALLOW: Record<AdminRole, string[]> = {
  SUPER_ADMIN:  ['/admin'],
  ADMIN:        ['/admin/orders', '/admin/customers', '/admin/products', '/admin/classificazione', '/admin/access-requests', '/admin/preview', '/admin/visual', '/admin'],
  COMMERCIALE:  ['/admin/orders', '/admin/customers', '/admin'],
  MAGAZZINO:    ['/admin/products', '/admin/classificazione', '/admin'],
};

export function canVisit(role: string, pathname: string): boolean {
  if (!isAdminRole(role)) return false;
  const allowed = ROLE_ALLOW[role as AdminRole] ?? [];
  // SUPER_ADMIN has wildcard
  if (allowed[0] === '/admin' && role === 'SUPER_ADMIN') return true;
  // exact '/admin' (dashboard) is always allowed for all admin roles
  if (pathname === '/admin') return true;
  return allowed.some((prefix) => pathname === prefix || pathname.startsWith(prefix + '/'));
}
