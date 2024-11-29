import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';
 
export async function middleware(request) {
  console.log('Middleware: Starting check for', request.url);
  
  const token = await getToken({ 
    req: request,
    secret: process.env.NEXTAUTH_SECRET
  });
  
  console.log('Middleware: Token status:', token ? 'exists' : 'none');

  // If no token, automatically sign in as anonymous
  if (!token) {
    console.log('Middleware: No token found, redirecting to anonymous signin');
    // We want to sign in anonymously and return to the original URL
    const url = request.nextUrl.clone();
    url.pathname = '/api/auth/signin';
    url.searchParams.set('callbackUrl', request.url);
    url.searchParams.set('anonymous', 'true');
    
    console.log('Middleware: Redirecting to:', url.toString());
    return NextResponse.redirect(url);
  }
 
  console.log('Middleware: Token exists, continuing');
  return NextResponse.next();
}
 
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
