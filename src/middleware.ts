import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import { isAdminRole, canVisit } from '@/lib/roles';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;
    const role = token?.role as string ?? '';

    if (pathname.startsWith('/admin')) {
      // Not an admin role → back to catalog
      if (!isAdminRole(role)) {
        return NextResponse.redirect(new URL('/catalog', req.url));
      }
      // Admin role but not allowed on this specific route → dashboard
      if (!canVisit(role, pathname)) {
        return NextResponse.redirect(new URL('/admin', req.url));
      }
    }

    const response = NextResponse.next();
    response.headers.set('x-pathname', pathname);
    return response;
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: '/login',
    },
  }
);

export const config = {
  matcher: [
    '/catalog/:path*',
    '/orders/:path*',
    '/admin/:path*',
  ],
};
