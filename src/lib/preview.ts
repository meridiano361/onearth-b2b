import { cookies } from 'next/headers';
import { isAdminRole } from './roles';

export interface PreviewData {
  organizationId: string;
  operatorId: string;
  orgName: string;
  operatorName: string;
  adminEmail: string;
}

export const PREVIEW_COOKIE = 'onearth_preview';

export function parsePreviewCookie(): PreviewData | null {
  try {
    const raw = cookies().get(PREVIEW_COOKIE)?.value;
    if (!raw) return null;
    const d = JSON.parse(raw) as Record<string, unknown>;
    if (!d?.previewMode || !d.organizationId || !d.operatorId || !d.adminEmail) return null;
    return d as unknown as PreviewData;
  } catch {
    return null;
  }
}

// Call this after you already have the session — avoids a second getServerSession call.
export function getPreviewFromSession(
  session: { user: { email?: string | null; role?: string | null } } | null
): PreviewData | null {
  if (!session?.user?.email) return null;
  if (!isAdminRole(session.user.role ?? '')) return null;
  const d = parsePreviewCookie();
  if (!d || d.adminEmail !== session.user.email) return null;
  return d;
}
