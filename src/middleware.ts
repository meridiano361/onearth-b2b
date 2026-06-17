import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import { isAdminRole, canVisit } from '@/lib/roles';
import { canAccessModa } from '@/lib/modaAccess';

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

    // Moda PE27 and Casa hub — exclusive access while experimental
    if (pathname.startsWith('/moda') || pathname.startsWith('/casa')) {
      if (!canAccessModa(role)) {
        return NextResponse.redirect(new URL('/catalog', req.url));
      }
    }

    // Destination selection page: only operators need it
    if (pathname === '/seleziona-destinazione') {
      if (isAdminRole(role)) {
        return NextResponse.redirect(new URL('/admin', req.url));
      }
      if (role === 'OPERATOR' && token?.destinazioneId) {
        return NextResponse.redirect(new URL('/catalog', req.url));
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
    '/admin',
    '/admin/:path*',
    '/moda/:path*',
    '/moda',
    '/casa/:path*',
    '/casa',
    '/seleziona-destinazione',
  ],
};
