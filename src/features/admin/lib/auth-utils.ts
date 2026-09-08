import { createHmac } from 'crypto';

/**
 * Verify admin session token using Node.js crypto / Edge Web Crypto API
 */
export function verifyAdminSessionToken(token?: string): boolean {
  if (!token) return false;
  const adminUsername = process.env.ADMIN_USERNAME;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const secret = process.env.SESSION_SECRET || process.env.R2_SECRET_ACCESS_KEY;
  if (!adminUsername || !adminPassword || !secret) return false;

  const expectedToken = createHmac('sha256', secret)
    .update(`${adminUsername}:${adminPassword}`)
    .digest('hex');

  return token === expectedToken;
}
