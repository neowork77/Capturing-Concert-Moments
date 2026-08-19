import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';

export const dynamic = 'force-dynamic';

function generateToken(username: string, password: string): string {
  const secret = process.env.SESSION_SECRET || process.env.R2_SECRET_ACCESS_KEY;
  if (!secret) {
    throw new Error('SESSION_SECRET or R2_SECRET_ACCESS_KEY is required for session signing');
  }
  return createHmac('sha256', secret)
    .update(`${username}:${password}`)
    .digest('hex');
}

export async function GET(request: NextRequest) {
  try {
    const adminUsername = process.env.ADMIN_USERNAME;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminUsername || !adminPassword) {
      return NextResponse.json({ authenticated: false }, { status: 200 });
    }

    const sessionToken = request.cookies.get('admin_session')?.value;

    if (!sessionToken) {
      return NextResponse.json({ authenticated: false }, { status: 200 });
    }

    const expectedToken = generateToken(adminUsername, adminPassword);

    if (sessionToken !== expectedToken) {
      return NextResponse.json({ authenticated: false }, { status: 200 });
    }

    return NextResponse.json({ authenticated: true }, { status: 200 });
  } catch (error: any) {
    console.error('Auth check error:', error);
    return NextResponse.json({ authenticated: false }, { status: 200 });
  }
}
