import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import { isAdminRole, canVisit } from '@/lib/roles';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;
    const role = token?.role as string ?? '';

    // Admin area guards
    if (pathname.startsWith('/admin')) {
      if (!isAdminRole(role)) {
        return NextResponse.redirect(new URL('/catalog', req.url));
      }
      if (!canVisit(role, pathname)) {
        return NextResponse.redirect(new URL('/admin', req.url));
      }
    }

    // Channel selection page: only operators need it
    if (pathname === '/seleziona-canale') {
      if (isAdminRole(role)) {
        return NextResponse.redirect(new URL('/admin', req.url));
      }
      // If operator already has a canale selected, skip this page
      if (role === 'OPERATOR' && token?.canaleId) {
        return NextResponse.redirect(new URL('/catalog', req.url));
      }
    }

    // Operators without a selected canale must go through channel selection first
    if (
      role === 'OPERATOR' &&
      !token?.canaleId &&
      (pathname.startsWith('/catalog') || pathname.startsWith('/orders'))
    ) {
      return NextResponse.redirect(new URL('/seleziona-canale', req.url));
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
    '/admin',
    '/admin/:path*',
    '/seleziona-canale',
  ],
};
