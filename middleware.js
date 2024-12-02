import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';
 
export async function middleware(request) {
  // Don't run middleware on auth-related paths
  if (
    request.nextUrl.pathname.startsWith('/api/auth') ||
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.includes('favicon.ico')
  ) {
    return NextResponse.next();
  }

  // console.log('Middleware: Starting check for', request.url);
  
  const token = await getToken({ 
    req: request,
    secret: process.env.NEXTAUTH_SECRET
  });
  
  // console.log('Middleware: Token status:', token ? 'exists' : 'none');

  // If no token, automatically sign in as anonymous
  if (!token) {
    // console.log('Middleware: No token found, redirecting to anonymous signin');
    const signInUrl = new URL('/api/auth/signin', request.url);
    signInUrl.searchParams.set('callbackUrl', request.url);
    signInUrl.searchParams.set('anonymous', 'true');
    
    // console.log('Middleware: Redirecting to:', signInUrl.toString());
    return NextResponse.redirect(signInUrl);
  }
 
  // console.log('Middleware: Token exists, continuing');
  return NextResponse.next();
}
 
// Update matcher to be more specific about which paths to handle
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (auth endpoints)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico).*)',
  ],
};
