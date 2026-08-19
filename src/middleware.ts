import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Verify admin session token using Web Crypto API (compatible with Edge Runtime)
 */
async function verifyAdminSession(token?: string): Promise<boolean> {
  if (!token) return false;
  const adminUsername = process.env.ADMIN_USERNAME;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const secret = process.env.SESSION_SECRET || process.env.R2_SECRET_ACCESS_KEY;
  if (!adminUsername || !adminPassword || !secret) return false;

  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(`${adminUsername}:${adminPassword}`);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  const hashArray = Array.from(new Uint8Array(signature));
  const expectedToken = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return token === expectedToken;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect /admin sub-routes (but not /admin itself — that's the login page)
  if (pathname.startsWith('/admin/') && pathname !== '/admin/') {
    const sessionToken = request.cookies.get('admin_session')?.value;
    const isValid = await verifyAdminSession(sessionToken);

    if (!isValid) {
      const url = request.nextUrl.clone();
      url.pathname = '/admin';
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path+'],
};
