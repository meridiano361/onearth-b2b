import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import { isAdminRole, canVisit } from '@/lib/roles';

const MODA_EMAIL = 'e.mazzolari@meridiano361.it';

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

    // Moda PE27 — exclusive to MODA_EMAIL
    if (pathname.startsWith('/moda')) {
      if ((token?.email as string) !== MODA_EMAIL) {
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
    '/seleziona-destinazione',
  ],
};
