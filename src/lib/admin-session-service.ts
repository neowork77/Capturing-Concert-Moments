import { db } from '@/db/db';
import { adminSessions } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

export interface DraftBookingData {
  bookingId?: number;
  date: string;
  eventName: string;
  timeSlot: string;
  customerName: string;
  customerPhone: string;
  lineDisplayName?: string;
  customerLineUserId?: string;
  cameraType?: string;
  notes?: string;
  paymentStatus?: 'unpaid' | 'deposit' | 'paid';
  depositAmount?: number;
  remainingAmount?: number;
}

export interface AdminSessionRecord {
  lineUserId: string;
  step: 'awaiting_payment_status' | 'awaiting_deposit_amount' | 'awaiting_remaining_amount' | 'awaiting_notes' | 'awaiting_final_confirmation';
  draftBooking: DraftBookingData;
  updatedAt: number;
}

export async function getAdminSession(lineUserId: string): Promise<AdminSessionRecord | null> {
  try {
    const [record] = await db.select().from(adminSessions).where(eq(adminSessions.lineUserId, lineUserId));
    if (!record) return null;
    return record as AdminSessionRecord;
  } catch (err: any) {
    console.error('❌ Error getting admin session:', err.message);
    return null;
  }
}

export async function setAdminSession(
  lineUserId: string,
  step: 'awaiting_payment_status' | 'awaiting_deposit_amount' | 'awaiting_remaining_amount' | 'awaiting_notes' | 'awaiting_final_confirmation',
  draftBooking: DraftBookingData
): Promise<void> {
  const nowUnix = Math.floor(Date.now() / 1000);
  try {
    const existing = await getAdminSession(lineUserId);
    if (existing) {
      await db
        .update(adminSessions)
        .set({
          step,
          draftBooking,
          updatedAt: nowUnix,
        })
        .where(eq(adminSessions.lineUserId, lineUserId));
    } else {
      await db.insert(adminSessions).values({
        lineUserId,
        step,
        draftBooking,
        updatedAt: nowUnix,
      });
    }
  } catch (err: any) {
    console.error('❌ Error setting admin session:', err.message);
  }
}

export async function clearAdminSession(lineUserId: string): Promise<void> {
  try {
    await db.delete(adminSessions).where(eq(adminSessions.lineUserId, lineUserId));
  } catch (err: any) {
    console.error('❌ Error clearing admin session:', err.message);
  }
}

export async function registerAdminUserId(lineUserId: string): Promise<void> {
  if (!lineUserId) return;
  const nowUnix = Math.floor(Date.now() / 1000);
  try {
    const existing = await getAdminSession(lineUserId);
    if (!existing) {
      await db.insert(adminSessions).values({
        lineUserId,
        step: 'awaiting_final_confirmation',
        draftBooking: {} as any,
        updatedAt: nowUnix,
      });
    }
  } catch (err: any) {
    console.error('❌ Error registering admin user ID:', err.message);
  }
}

export async function getLatestAdminUserId(): Promise<string | null> {
  if (process.env.LINE_ADMIN_USER_ID) return process.env.LINE_ADMIN_USER_ID;
  try {
    const records = await db.select().from(adminSessions).orderBy(desc(adminSessions.updatedAt)).limit(1);
    return records[0]?.lineUserId || null;
  } catch (err) {
    return null;
  }
}

export async function pushLineMessage(userId: string, messageData: any, tokenType: 'customer' | 'admin' = 'customer'): Promise<boolean> {
  if (!userId) return false;
  const token = tokenType === 'admin'
    ? (process.env.LINE_ADMIN_CHANNEL_ACCESS_TOKEN || process.env.LINE_CHANNEL_ACCESS_TOKEN)
    : (process.env.LINE_CHANNEL_ACCESS_TOKEN || process.env.LINE_ADMIN_CHANNEL_ACCESS_TOKEN);

  if (!token) {
    console.error(`❌ LINE Channel Access Token missing for push (${tokenType})`);
    return false;
  }

  let messages: any[] = [];
  if (typeof messageData === 'string') {
    messages = [{ type: 'text', text: messageData }];
  } else if (Array.isArray(messageData)) {
    messages = messageData.map(m => (typeof m === 'string' ? { type: 'text', text: m } : { ...m }));
  } else if (typeof messageData === 'object' && messageData !== null) {
    messages = [messageData.type ? { ...messageData } : { type: 'text', text: JSON.stringify(messageData) }];
  }

  if (tokenType === 'admin' && messages.length > 0) {
    const lastIdx = messages.length - 1;
    if (!messages[lastIdx].quickReply) {
      messages[lastIdx].quickReply = {
        items: [
          { type: 'action', action: { type: 'message', label: '📌 คิวรออนุมัติ', text: 'คิวรออนุมัติ' } },
          { type: 'action', action: { type: 'message', label: '🗓️ เช็ก', text: 'เช็ก' } },
          { type: 'action', action: { type: 'message', label: '📋 แบบฟอร์ม', text: 'แบบฟอร์ม' } },
        ],
      };
    }
  }

  try {
    const res = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        to: userId,
        messages,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`❌ LINE Push Error (${tokenType}):`, errText);
      return false;
    }
    return true;
  } catch (err: any) {
    console.error(`❌ LINE Push Exception (${tokenType}):`, err.message);
    return false;
  }
}
