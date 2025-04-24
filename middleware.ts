import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request });
  const isAuth = !!token;
  const isAuthPage = request.nextUrl.pathname.startsWith('/login');
  const isSuperAdminPage = request.nextUrl.pathname.startsWith('/superadmin');
  const isDashboardPage = request.nextUrl.pathname.startsWith('/dashboard');

  // Redirect authenticated users away from auth pages
  if (isAuthPage && isAuth) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Protect superadmin routes
  if (isSuperAdminPage) {
    if (!isAuth) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    if (token?.role !== 'superadmin') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // Protect dashboard routes
  if (isDashboardPage && !isAuth) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/superadmin/:path*', '/login'],
}; 