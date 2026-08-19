import { createHmac } from 'crypto';

export const TIME_SLOTS = [
  "11:00-11:20", "11:30-11:50",
  "12:00-12:20", "12:30-12:50", "13:00-13:20", "13:30-13:50",
  "14:00-14:20", "14:30-14:50", "15:00-15:20", "15:30-15:50",
  "16:00-16:20", "16:30-16:50", "17:00-17:20", "17:30-17:50"
];

/**
 * Verify LINE Webhook Signature securely
 */
export function verifyLineSignature(body: string, signature: string | null, channelSecret: string | undefined): boolean {
  if (!signature || !channelSecret) return false;
  const hash = createHmac('sha256', channelSecret).update(body).digest('base64');
  return hash === signature;
}

/**
 * Send reply message to LINE API
 */
export async function replyToLine(replyToken: string, messageObject: any, tokenOverride?: string): Promise<void> {
  if (!replyToken || replyToken === '00000000000000000000000000000000' || replyToken === 'ffffffffffffffffffffffffffffffff') {
    return;
  }

  const token = tokenOverride || process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) {
    console.error('❌ LINE Channel Access Token is missing');
    return;
  }

  const messages = Array.isArray(messageObject)
    ? messageObject
    : typeof messageObject === 'string'
    ? [{ type: 'text', text: messageObject }]
    : messageObject.type
    ? [messageObject]
    : [{ type: 'text', text: JSON.stringify(messageObject) }];

  try {
    const response = await fetch('https://api.line.me/v2/bot/message/reply', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        replyToken,
        messages,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('❌ LINE Reply Error:', errorData);
    }
  } catch (err: any) {
    console.error('❌ LINE Reply Exception:', err.message);
  }
}

/**
 * Get user profile display name from LINE API
 */
export async function getLineUserProfile(userId?: string, tokenOverride?: string): Promise<string> {
  if (!userId) return 'ไม่ระบุชื่อไลน์';
  const token = tokenOverride || process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) return 'ไม่ระบุชื่อไลน์';

  try {
    const response = await fetch(`https://api.line.me/v2/bot/profile/${userId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (response.ok) {
      const profile = await response.json();
      return profile.displayName || 'ไม่ระบุชื่อไลน์';
    }
  } catch (error: any) {
    console.error('❌ ดึงโปรไฟล์ LINE ล้มเหลว:', error.message);
  }
  return 'ไม่ระบุชื่อไลน์';
}

/**
 * Format image URL for LINE Flex Message
 */
export function resolvePublicImageUrl(rawImageUrl: string | null | undefined, req?: Request): string | null {
  if (!rawImageUrl || !rawImageUrl.trim()) return null;
  const cleaned = rawImageUrl.trim();

  if (cleaned.startsWith('http://') || cleaned.startsWith('https://')) {
    if (cleaned.startsWith('http://') && !cleaned.includes('localhost') && !cleaned.includes('127.0.0.1')) {
      return cleaned.replace(/^http:\/\//i, 'https://');
    }
    return cleaned;
  }

  const fwdHost = req?.headers?.get('x-forwarded-host');
  const reqHost = req?.headers?.get('host');

  let host = fwdHost || reqHost || '';

  const envUrl = process.env.NEXT_PUBLIC_BASE_URL;
  if (envUrl && !envUrl.includes('your-production-domain') && !envUrl.includes('example.com') && !envUrl.includes('localhost')) {
    const cleanEnvHost = envUrl.replace(/^https?:\/\//i, '').replace(/\/$/, '');
    if (cleanEnvHost && (!fwdHost || !fwdHost.includes('ngrok'))) {
      host = cleanEnvHost;
    }
  }

  if (!host || host.includes('localhost') || host.includes('127.0.0.1')) {
    if (fwdHost) host = fwdHost;
  }

  if (!host) return null;

  const cleanPath = cleaned.startsWith('/') ? cleaned : `/${cleaned}`;
  return `https://${host}${cleanPath}`;
}

/**
 * Format phone number string into 081-234-5678 format
 */
export function formatPhoneNumber(phoneStr: string): string {
  const cleaned = phoneStr.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
  } else if (cleaned.length === 9) {
    return cleaned.replace(/(\d{2})(\d{3})(\d{4})/, '0$1-$2-$3');
  }
  return phoneStr;
}

/**
 * Get current date in Thailand (Asia/Bangkok) time zone formatted as YYYY-MM-DD
 */
export function getTodayThailandDateString(): string {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(new Date());
  const year = parts.find(p => p.type === 'year')?.value || '2026';
  const month = parts.find(p => p.type === 'month')?.value || '01';
  const day = parts.find(p => p.type === 'day')?.value || '01';
  return `${year}-${month}-${day}`;
}
