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

  
  const token = await getToken({ 
    req: request,
    secret: process.env.NEXTAUTH_SECRET
  });
  

  // If no token, automatically sign in as anonymous
  if (!token) {
    const signInUrl = new URL('/api/auth/signin', request.url);
    signInUrl.searchParams.set('callbackUrl', request.url);
    signInUrl.searchParams.set('anonymous', 'true');
    
    return NextResponse.redirect(signInUrl);
  }
 
  return NextResponse.next();
}
 
// Allowlist: only run the auth middleware on routes that actually need a session.
// Everything else (robots.txt, sitemap.xml, llms.txt, marketing pages, etc.)
// bypasses the middleware so crawlers can access them without being 307-redirected
// to the sign-in page.
export const config = {
  matcher: [
    '/generate',
    '/mycodes',
    '/mycodes/:path*',
    '/profile',
    '/profile/:path*',
    '/images/:path*',
  ],
};
