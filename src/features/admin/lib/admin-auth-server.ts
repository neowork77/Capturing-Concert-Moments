import { createHmac } from 'crypto';

export function generateAdminToken(username: string, password: string): string {
  const secret = process.env.SESSION_SECRET || process.env.R2_SECRET_ACCESS_KEY;
  if (!secret) {
    throw new Error('SESSION_SECRET or R2_SECRET_ACCESS_KEY is required for session signing');
  }
  return createHmac('sha256', secret)
    .update(`${username}:${password}`)
    .digest('hex');
}

export function verifyAdminSessionToken(sessionToken?: string | null): boolean {
  if (!sessionToken) return false;

  const adminUsername = process.env.ADMIN_USERNAME;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminUsername || !adminPassword) return false;

  try {
    const expectedToken = generateAdminToken(adminUsername, adminPassword);
    return sessionToken === expectedToken;
  } catch (error) {
    console.error('Error verifying admin session token:', error);
    return false;
  }
}

